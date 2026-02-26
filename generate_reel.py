#!/usr/bin/env python3
"""
IELTS/PTE Reel Generator — Unified Orchestrator
Generates short-form video reels for IELTS & PTE listening practice.
Supports multiple question types via the generator registry.
"""

import argparse
import asyncio
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

from gtts import gTTS
from mutagen.mp3 import MP3
from pydub import AudioSegment

from config import (
    BASE_DIR, CONTENT_PLAN, CUE_CARD_CONTENT_PLAN, CLEAN_MCQ_CONTENT_PLAN,
    OUTPUT_DIR, CUE_CARD_OUTPUT_DIR, CLEAN_MCQ_OUTPUT_DIR,
    REMOTION_DIR, REMOTION_PUBLIC, CAPTIONS_DIR, CTA_VIDEO, FPS,
)
from generators.base import BaseGenerator
from generators.sentence_completion import SentenceCompletionGenerator
from generators.mcq_single import MCQSingleGenerator
from generators.note_completion import NoteCompletionGenerator
from generators.table_completion import TableCompletionGenerator
from generators.highlight_incorrect import HighlightIncorrectGenerator
from generators.form_completion import FormCompletionGenerator
from generators.matching_classification import MatchingClassificationGenerator
from generators.mcq_multiple import MCQMultipleGenerator
from generators.mcq_single_pte import MCQSinglePTEGenerator
from generators.cue_card import CueCardGenerator
from generators.mcq_single_clean import MCQSingleCleanGenerator

# ── Hook Intro Config ────────────────────────────────────────────────────────
HOOK_INTRO_DURATION = 5  # seconds — set to 0 to disable hook intros

# Maps question_type → display label shown in the hook intro
QUESTION_TYPE_LABELS: dict[str, str] = {
    "sentence_completion": "Sentence Completion",
    "mcq_single": "Multiple Choice",
    "note_completion": "Note Completion",
    "table_completion": "Table Completion",
    "highlight_incorrect": "Highlight Incorrect",
    "form_completion": "Note Completion",
    "matching_classification": "Matching",
    "mcq_multiple": "Multiple Answers",
    "mcq_single_pte": "Multiple Choice",
    "cue_card": "Speaking Part 2",
    "mcq_single_clean": "Multiple Choice",
}

# ── Generator Registry ────────────────────────────────────────────────────────
# Maps question_type string → Generator class
# Add new types here as they are built.
GENERATOR_REGISTRY: dict[str, type[BaseGenerator]] = {
    # Original types (monologue audio)
    "sentence_completion": SentenceCompletionGenerator,
    "mcq_single": MCQSingleGenerator,
    "note_completion": NoteCompletionGenerator,
    "table_completion": TableCompletionGenerator,
    "highlight_incorrect": HighlightIncorrectGenerator,
    # New dialogue-voice types
    "form_completion": FormCompletionGenerator,
    "matching_classification": MatchingClassificationGenerator,
    "mcq_multiple": MCQMultipleGenerator,
    "mcq_single_pte": MCQSinglePTEGenerator,
    # Speaking types (per-sentence audio)
    "cue_card": CueCardGenerator,
    # Clean minimal style (black bg + white card)
    "mcq_single_clean": MCQSingleCleanGenerator,
}


# ── LLM (Cerebras primary → Groq fallback) ───────────────────────────────────
from llm_client import chat_completion, generate_json


def generate_content_with_llm(
    generator: BaseGenerator,
    scenario: str,
    category: str,
    max_retries: int = 3,
) -> dict:
    """Call LLM with automatic provider fallback. Retries on invalid JSON."""
    prompt = generator.build_prompt(scenario, category)
    messages = [
        {
            "role": "system",
            "content": (
                "You are an IELTS/PTE content generator. "
                "Return ONLY valid JSON, no markdown fences or extra text."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    try:
        data = generate_json(messages, temperature=0.7, max_tokens=2048, max_retries=max_retries)
        generator.validate_response(data)
        return data
    except Exception as e:
        print(f"ERROR: LLM call failed: {e}")
        sys.exit(1)


# ── Caption Generation ────────────────────────────────────────────────────────
def generate_caption(
    generator: BaseGenerator,
    scenario: str,
    category: str,
) -> str:
    """Generate Instagram caption via LLM. Returns full caption string."""
    exam = generator.exam_type
    qtype_display = generator.question_type.replace("_", " ").title()

    # Determine section (speaking vs listening) for caption context
    is_speaking = generator.question_type == "cue_card"
    section = "speaking" if is_speaking else "listening"
    section_tag = "#IELTSSpeaking" if is_speaking else "#IELTSListening"
    required_tags = f"#IELTS #IELTSPreparation #BandLadder {section_tag}"
    if exam == "PTE":
        required_tags += " #PTE #PTEAcademic #PTEListening"

    prompt = f"""Generate an engaging Instagram Reel caption for a {exam} {section} practice video.

Question type: {qtype_display}
Topic: {scenario}
Category: {category}

Requirements:
- Start with a hook emoji + question or statement (1 line)
- 1-2 more lines of engaging text with a call to action
- End with 15-20 relevant hashtags on a new line
- Hashtags MUST include: {required_tags}
- Keep total caption under 300 characters (before hashtags)

Return ONLY the caption text (no JSON, no markdown fences). Example:
🎧 Can you complete these sentences? Test your {section} skills!
Follow @bandladder for daily IELTS practice! 💪

{required_tags} #IELTSTips #StudyAbroad"""

    try:
        messages = [
            {"role": "system", "content": "You are a social media caption writer for an IELTS/PTE test prep brand. Write engaging, concise Instagram captions."},
            {"role": "user", "content": prompt},
        ]
        caption = chat_completion(messages, temperature=0.8, max_tokens=500)
        # Remove any markdown fences if present
        caption = re.sub(r"^```\s*", "", caption)
        caption = re.sub(r"\s*```$", "", caption)
        return caption
    except Exception as e:
        print(f"  Warning: Caption generation failed ({e}). Using default caption.")
        section_cap = "Speaking" if is_speaking else "Listening"
        return (
            f"🎧 Practice your {exam} {section_cap} skills with this {qtype_display} exercise!\n"
            f"Follow @bandladder for daily practice! 💪\n\n"
            f"{required_tags} #StudyAbroad #EnglishTest #IELTSTips"
        )


# ── Audio ──────────────────────────────────────────────────────────────────────

# edge-tts voice map — distinct male/female voices for dialogue
VOICE_MAP = {
    "Speaker A": "en-GB-RyanNeural",      # British male
    "Speaker B": "en-AU-NatashaNeural",    # Australian female
    "Speaker C": "en-US-GuyNeural",        # American male (if 3+ speakers)
    "Speaker D": "en-IE-EmilyNeural",      # Irish female
}

# Fallback single voice for monologue scripts
MONOLOGUE_VOICE = "en-GB-RyanNeural"

# Map accent codes to full edge-tts voice names (for cue card / speaking types)
ACCENT_TO_VOICE = {
    "en-GB": "en-GB-RyanNeural",
    "en-US": "en-US-GuyNeural",
    "en-AU": "en-AU-NatashaNeural",
    "en-IE": "en-IE-ConnorNeural",
}


async def _generate_edge_tts_segment(text: str, voice: str, output_path: str):
    """Generate a single audio segment using edge-tts."""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


def _generate_dialogue_audio(script: str, output_path: Path) -> float:
    """Parse dialogue script into speaker segments, generate each with
    a different edge-tts voice, merge with silences between turns."""

    # Parse speaker segments: [(speaker_label, text), ...]
    segments = re.findall(
        r"(Speaker [A-Z]):\s*(.*?)(?=Speaker [A-Z]:|$)", script, re.DOTALL
    )

    if not segments:
        # Fallback: treat entire script as monologue
        print("  No speaker labels found, falling back to monologue.")
        return _generate_monologue_audio(script, output_path)

    print(f"  Generating dialogue audio with edge-tts ({len(segments)} segments)...")
    temp_dir = Path(tempfile.mkdtemp(prefix="dialogue_"))
    combined = AudioSegment.empty()
    silence_gap = AudioSegment.silent(duration=400)  # 400ms between turns

    try:
        for i, (speaker, text) in enumerate(segments):
            text = text.strip()
            if not text:
                continue

            voice = VOICE_MAP.get(speaker, MONOLOGUE_VOICE)
            temp_file = temp_dir / f"seg_{i:02d}_{speaker.replace(' ', '_')}.mp3"

            # Generate segment with edge-tts (async)
            asyncio.run(_generate_edge_tts_segment(text, voice, str(temp_file)))

            segment_audio = AudioSegment.from_mp3(str(temp_file))
            if len(combined) > 0:
                combined += silence_gap
            combined += segment_audio

        # Export merged audio
        combined.export(str(output_path), format="mp3")
        duration = len(combined) / 1000.0
        print(f"  Dialogue audio generated: {duration:.1f}s ({len(segments)} turns)")
        return duration

    finally:
        # Clean up temp directory
        shutil.rmtree(str(temp_dir), ignore_errors=True)


def _generate_monologue_audio(script: str, output_path: Path) -> float:
    """Generate single-voice audio using edge-tts for monologue scripts."""
    # Strip any stray speaker labels
    clean_script = re.sub(r"Speaker [A-Z]:\s*", "", script).strip()

    print("  Generating monologue audio with edge-tts...")
    asyncio.run(_generate_edge_tts_segment(clean_script, MONOLOGUE_VOICE, str(output_path)))

    audio = MP3(str(output_path))
    duration = audio.info.length
    print(f"  Audio duration: {duration:.1f}s")
    return duration


def generate_audio(script: str, accent: str, output_path: Path) -> float:
    """Generate TTS audio and return duration in seconds.
    Detects dialogue (Speaker A/B labels) and uses multi-voice edge-tts.
    Falls back to single-voice for monologue scripts.
    """
    has_dialogue = bool(re.search(r"Speaker [A-Z]:", script))

    if has_dialogue:
        return _generate_dialogue_audio(script, output_path)
    else:
        return _generate_monologue_audio(script, output_path)


# ── Remotion Renderer ──────────────────────────────────────────────────────────
def render_with_remotion(
    composition_id: str,
    props: dict,
    audio_path: Path,
    output_path: Path,
    entry_id: int | str = "temp",
):
    """Render video using Remotion CLI with embedded audio."""

    # 1. Copy audio to Remotion's public/ directory
    audio_filename = f"audio_{entry_id}.mp3"
    target_audio = REMOTION_PUBLIC / audio_filename
    shutil.copy2(str(audio_path), str(target_audio))
    print(f"  Audio copied to Remotion public/{audio_filename}")

    # 2. Update audio filename in props
    props["audioFileName"] = audio_filename

    # 3. Write props as JSON file
    props_file = REMOTION_DIR / "input-props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False)
    print(f"  Props written to input-props.json")

    # 4. Call Remotion CLI render
    cmd = [
        "npx", "remotion", "render",
        "src/index.ts",
        composition_id,
        str(output_path),
        "--props", str(props_file),
        "--codec", "h264",
    ]

    print(f"  Rendering with Remotion ({composition_id}, 1080x1920, {FPS}fps)...")
    result = subprocess.run(
        cmd,
        cwd=str(REMOTION_DIR),
        capture_output=True,
        text=True,
        shell=True,  # Required on Windows for npx
        timeout=600,
    )

    if result.returncode != 0:
        print(f"Remotion render error:\n{result.stderr}")
        if result.stdout:
            print(f"Remotion stdout:\n{result.stdout}")
        raise RuntimeError(f"Remotion render failed for {composition_id}")

    print(f"  Video rendered: {output_path.name}")

    # 5. Clean up temporary files in Remotion project
    if target_audio.exists():
        target_audio.unlink()
    if props_file.exists():
        props_file.unlink()
    print("  Temp files cleaned up.")


# ── Thumbnail Extraction ─────────────────────────────────────────────────────
THUMBNAILS_DIR = BASE_DIR / "content" / "thumbnails"


def extract_thumbnail(video_path: Path, timestamp: float = 3.0) -> Path | None:
    """Extract a single frame from the video as a thumbnail image.
    Captures at `timestamp` seconds (default 7s = after hook intro).
    Returns the thumbnail path or None on failure.
    """
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
    thumb_name = video_path.stem + "_thumb.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_name

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", str(video_path),
        "-frames:v", "1",
        "-q:v", "2",  # high quality JPEG
        str(thumb_path),
    ]

    print(f"  Extracting thumbnail at {timestamp}s...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0 or not thumb_path.exists():
        print(f"  WARNING: Thumbnail extraction failed: {result.stderr[:200]}")
        return None

    size_kb = thumb_path.stat().st_size / 1024
    print(f"  Thumbnail saved: {thumb_name} ({size_kb:.0f} KB)")
    return thumb_path


# ── CTA Append ────────────────────────────────────────────────────────────────
def append_cta(video_path: Path) -> Path:
    """Append the pre-rendered CTA end screen (with voiceover) to a reel video.
    Uses ffmpeg concat demuxer for lossless join. Returns the final output path.
    """
    if not CTA_VIDEO.exists():
        print(f"  WARNING: CTA video not found at {CTA_VIDEO}. Skipping CTA append.")
        return video_path

    # Create concat list file (ASCII, no BOM — ffmpeg requirement)
    list_file = Path(tempfile.gettempdir()) / "cta_concat_list.txt"
    list_content = f"file '{video_path}'\nfile '{CTA_VIDEO}'"
    list_file.write_text(list_content, encoding="ascii")

    # Output to a temp file, then replace original
    temp_output = video_path.with_suffix(".cta_tmp.mp4")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(list_file),
        "-c", "copy",
        str(temp_output),
    ]

    print(f"  Appending CTA end screen ({CTA_VIDEO.name})...")
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=60,
    )

    # Clean up list file
    if list_file.exists():
        list_file.unlink()

    if result.returncode != 0:
        print(f"  WARNING: ffmpeg concat failed: {result.stderr[:300]}")
        if temp_output.exists():
            temp_output.unlink()
        return video_path

    # Replace original with CTA version
    if temp_output.exists():
        video_path.unlink()
        temp_output.rename(video_path)
        print(f"  CTA appended successfully: {video_path.name}")

    return video_path


# ── Content Plan Helpers ───────────────────────────────────────────────────────
def _get_plan_path(question_type: str | None = None) -> Path:
    """Return the content plan path — cue_card and mcq_single_clean use their own files."""
    if question_type == "cue_card":
        return CUE_CARD_CONTENT_PLAN
    if question_type == "mcq_single_clean":
        return CLEAN_MCQ_CONTENT_PLAN
    return CONTENT_PLAN


def load_plan(question_type: str | None = None) -> list[dict]:
    plan_path = _get_plan_path(question_type)
    with open(plan_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_plan(plan: list[dict], question_type: str | None = None):
    plan_path = _get_plan_path(question_type)
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)


def get_next_unused(plan: list[dict], question_type: str | None = None) -> dict | None:
    """Get next unused entry. Optionally filter by question_type."""
    for entry in plan:
        if not entry["used"]:
            if question_type is None or entry["question_type"] == question_type:
                return entry
    return None


def get_batch_entries(plan: list[dict], count: int) -> list[dict]:
    """Pick `count` unused entries, preferring type diversity (round-robin)."""
    unused_by_type: dict[str, list[dict]] = {}
    for entry in plan:
        if not entry["used"] and entry["question_type"] in GENERATOR_REGISTRY:
            unused_by_type.setdefault(entry["question_type"], []).append(entry)

    if not unused_by_type:
        return []

    # Round-robin across types for diversity
    selected = []
    type_keys = list(unused_by_type.keys())
    random.shuffle(type_keys)
    idx = 0
    while len(selected) < count and any(unused_by_type.values()):
        qtype = type_keys[idx % len(type_keys)]
        if unused_by_type[qtype]:
            selected.append(unused_by_type[qtype].pop(0))
        idx += 1
        # Remove empty types
        type_keys = [t for t in type_keys if unused_by_type.get(t)]
        if not type_keys:
            break

    return selected


def mark_used(plan: list[dict], entry_id: int, question_type: str | None = None):
    for entry in plan:
        if entry["id"] == entry_id:
            entry["used"] = True
            break
    save_plan(plan, question_type=question_type)


# ── Single Reel Pipeline ──────────────────────────────────────────────────────
def generate_single_reel(
    entry: dict,
    generator: BaseGenerator,
    test_mode: bool = False,
) -> tuple[Path, str]:
    """Generate one reel. Returns (video_path, caption)."""

    entry_id = entry["id"]
    category = entry["category"]
    scenario = entry["scenario"]

    print(f"\n{'='*60}")
    print(f"  Reel #{entry_id}: [{category}] {scenario}")
    print(f"  Type: {generator.question_type} | Exam: {generator.exam_type}")
    print(f"{'='*60}\n")

    # 1. Generate content
    if test_mode:
        print("  [TEST MODE] Using sample content (skipping LLM).")
        content = generator.get_sample_content()
    else:
        content = generate_content_with_llm(generator, scenario, category)
    content["category"] = category
    content["entry_id"] = entry_id

    # 2. Generate audio
    audio_path = BASE_DIR / "temp_audio.mp3"

    # Cue card generators use per-sentence audio for precise highlight sync
    if hasattr(generator, "generate_per_sentence_audio"):
        sentences = content.get("model_answer_sentences", [])
        accent = generator.get_voice_accent(content)
        # Resolve accent code (e.g. "en-GB") to full edge-tts voice name
        voice = ACCENT_TO_VOICE.get(accent, accent)
        if not voice.endswith("Neural"):
            voice = MONOLOGUE_VOICE  # safe fallback
        duration, sentence_timings = generator.generate_per_sentence_audio(
            sentences, voice, audio_path,
        )
        content["sentence_timings"] = sentence_timings
    else:
        duration = generate_audio(
            generator.get_audio_script(content),
            generator.get_voice_accent(content),
            audio_path,
        )

    # 3. Build Remotion props
    props = generator.build_remotion_props(content, duration, f"audio_{entry_id}.mp3")

    # 3b. Inject hook/CTA props — different for clean vs standard compositions
    if generator.question_type == "mcq_single_clean":
        # Clean composition: inline hook (3s) + CTA (5s) in same black+card style
        from generators.mcq_single_clean import (
            CLEAN_HOOK_DURATION, CLEAN_CTA_DURATION,
            CLEAN_HOOK_TEXT, CLEAN_CTA_LINE1, CLEAN_CTA_LINE2,
        )
        props["hookDuration"] = CLEAN_HOOK_DURATION
        props["hookText"] = CLEAN_HOOK_TEXT
        props["ctaDuration"] = CLEAN_CTA_DURATION
        props["ctaLine1"] = CLEAN_CTA_LINE1
        props["ctaLine2"] = CLEAN_CTA_LINE2
        props["durationSeconds"] = round(
            props["durationSeconds"] + CLEAN_HOOK_DURATION + CLEAN_CTA_DURATION, 2
        )
        print(f"  Clean hook: {CLEAN_HOOK_DURATION}s + CTA: {CLEAN_CTA_DURATION}s "
              f"(total: {props['durationSeconds']}s)")
    elif HOOK_INTRO_DURATION > 0:
        # Standard BandLadder animated hook intro (5s)
        props["hookIntroDuration"] = HOOK_INTRO_DURATION
        props["questionTypeLabel"] = QUESTION_TYPE_LABELS.get(
            generator.question_type, generator.question_type.replace("_", " ").title()
        )
        # Speaking types show "IELTS Speaking" instead of "IELTS Listening"
        if generator.question_type == "cue_card":
            props["sectionLabel"] = "Speaking"
        # Increase total duration to account for the hook intro
        props["durationSeconds"] = round(props["durationSeconds"] + HOOK_INTRO_DURATION, 2)
        print(f"  Hook intro: {HOOK_INTRO_DURATION}s added (total: {props['durationSeconds']}s)")

    # 4. Render video — route to type-specific output subfolder
    date_str = datetime.now().strftime("%Y%m%d")
    final_name = f"{generator.get_output_prefix()}_{entry_id}_{date_str}.mp4"
    if generator.question_type == "cue_card":
        out_dir = CUE_CARD_OUTPUT_DIR
    elif generator.question_type == "mcq_single_clean":
        out_dir = CLEAN_MCQ_OUTPUT_DIR
    else:
        out_dir = OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    final_path = out_dir / final_name

    render_with_remotion(
        composition_id=generator.remotion_composition_id,
        props=props,
        audio_path=audio_path,
        output_path=final_path,
        entry_id=entry_id,
    )

    # 5. Clean up temp audio
    if audio_path.exists():
        audio_path.unlink()

    # 5b. Append CTA end screen — skip for clean (CTA is baked into Remotion)
    if generator.question_type != "mcq_single_clean":
        final_path = append_cta(final_path)

    # 5c. Extract thumbnail (clean: at 5s after hook; standard: at 3s)
    thumb_ts = 5.0 if generator.question_type == "mcq_single_clean" else 3.0
    thumb_path = extract_thumbnail(final_path, timestamp=thumb_ts)

    # 6. Generate caption
    if test_mode:
        caption = f"🎧 Test caption for {generator.question_type} #{entry_id}\n#IELTS #BandLadder #Test"
    else:
        print("  Generating Instagram caption...")
        caption = generate_caption(generator, scenario, category)

    # 7. Save caption file
    CAPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    caption_file = CAPTIONS_DIR / f"{final_name.replace('.mp4', '_caption.txt')}"
    with open(caption_file, "w", encoding="utf-8") as f:
        f.write(caption)
    print(f"  Caption saved: {caption_file.name}")

    # 8. Mark entry as used (skip in test mode — test shouldn't consume entries)
    if not test_mode:
        plan = load_plan(question_type=generator.question_type)
        mark_used(plan, entry_id, question_type=generator.question_type)
        print(f"  Content plan entry #{entry_id} marked as used.")
    else:
        print(f"  [TEST MODE] Entry #{entry_id} NOT marked as used.")

    print(f"\n  DONE! Output: {final_path}\n")
    return final_path, caption, thumb_path


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="IELTS/PTE Reel Generator — Multi-type video generation"
    )
    parser.add_argument(
        "--type",
        choices=list(GENERATOR_REGISTRY.keys()),
        help="Force a specific question type",
    )
    parser.add_argument(
        "--batch",
        type=int,
        metavar="N",
        help="Generate N videos in one run (diverse types)",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Use sample data instead of calling Groq",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Launch Remotion Studio for interactive preview",
    )
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Preview mode
    if args.preview:
        print("\n  [PREVIEW MODE] Launching Remotion Studio...")
        subprocess.Popen(
            ["npx", "remotion", "studio", "src/index.ts"],
            cwd=str(REMOTION_DIR),
            shell=True,
        )
        return

    # Load the correct content plan based on --type flag
    plan = load_plan(question_type=args.type)

    # Batch mode
    if args.batch:
        # When --type is specified, get_batch_entries picks only that type
        entries = get_batch_entries(plan, args.batch)
        if not entries:
            print("No unused entries available!")
            sys.exit(0)

        label = f" (type={args.type})" if args.type else ""
        print(f"\n  Batch mode: generating {len(entries)} reels{label}\n")
        results = []
        for entry in entries:
            qtype = entry["question_type"]
            generator_cls = GENERATOR_REGISTRY[qtype]
            generator = generator_cls()
            try:
                video_path, caption, thumb = generate_single_reel(entry, generator, args.test)
                results.append((entry["id"], qtype, video_path, "SUCCESS"))
            except Exception as e:
                print(f"  ERROR generating reel #{entry['id']}: {e}")
                results.append((entry["id"], qtype, None, f"FAILED: {e}"))

        # Summary
        print(f"\n{'='*60}")
        print(f"  BATCH SUMMARY: {len(results)} reels{label}")
        print(f"{'='*60}")
        for eid, qtype, vpath, status in results:
            fname = vpath.name if vpath else "N/A"
            print(f"  #{eid} [{qtype}] — {status} — {fname}")
        print()
        return

    # Single mode
    if args.type:
        entry = get_next_unused(plan, args.type)
        if entry is None:
            print(f"No unused entries for type '{args.type}'!")
            sys.exit(0)
    else:
        entry = get_next_unused(plan)
        if entry is None:
            print("All content plan entries have been used!")
            sys.exit(0)

    qtype = entry["question_type"]
    if qtype not in GENERATOR_REGISTRY:
        print(f"ERROR: No generator registered for type '{qtype}'")
        sys.exit(1)

    generator = GENERATOR_REGISTRY[qtype]()
    generate_single_reel(entry, generator, args.test)


if __name__ == "__main__":
    main()
