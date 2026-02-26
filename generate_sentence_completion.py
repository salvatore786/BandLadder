#!/usr/bin/env python3
"""
IELTS Sentence Completion Reel Generator
Generates short-form video reels for IELTS listening practice.
Uses Remotion (React) for frame-perfect video rendering.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import webbrowser
from datetime import datetime
from pathlib import Path

from groq import Groq
from gtts import gTTS
from mutagen.mp3 import MP3


# ── Sample Data (for --test mode) ─────────────────────────────────────────────
SAMPLE_CONTENT = {
    "title": "Sentence Completion",
    "scenario_description": "A student asks about joining the university library",
    "audio_script": (
        "Speaker A: Good morning, I'd like to find out about getting a library card, please. "
        "Speaker B: Of course. Library membership costs twenty-five pounds per year for students. "
        "Speaker A: That sounds reasonable. What do I need to bring? "
        "Speaker B: You'll need to bring your student ID when you come to register. "
        "Speaker A: Right. And what are the opening hours? "
        "Speaker B: We open at half past eight on weekdays, and ten o'clock on Saturdays. "
        "Speaker A: Great. How long can I keep books for? "
        "Speaker B: Books can be borrowed for up to three weeks at a time. "
        "Speaker A: And if I return them late? "
        "Speaker B: There's a late return fee of fifty pence per day per item."
    ),
    "display_sentences": [
        "The library membership costs ___ per year.",
        "Students need to bring their ___ to register.",
        "The library opens at ___ on weekdays.",
        "Books can be borrowed for ___ weeks.",
        "The late return fee is ___ per day."
    ],
    "answers": ["\u00a325", "student ID", "8:30 AM", "3", "50p"],
    "voice_accent": "en-GB"
}

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
CONTENT_PLAN = BASE_DIR / "content" / "content_plan.json"
OUTPUT_DIR = BASE_DIR / "output"
REMOTION_DIR = BASE_DIR / "remotion-video"
REMOTION_PUBLIC = REMOTION_DIR / "public"


# ── Groq LLM ──────────────────────────────────────────────────────────────────
def get_groq_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("ERROR: GROQ_API_KEY environment variable is not set.")
        sys.exit(1)
    return Groq(api_key=api_key)


def generate_content_with_llm(scenario: str, category: str, max_retries: int = 3) -> dict:
    """Call Groq (Llama 3.3 70B) to produce exercise JSON. Retries on invalid JSON."""
    client = get_groq_client()

    prompt = f"""Generate an IELTS Listening Section 1 Sentence Completion exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Sentence Completion",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between two speakers about the scenario. Include Speaker A and Speaker B labels. This is what gets converted to audio.",
  "display_sentences": [
    "Example sentence with ___ blank.",
    "Another sentence with ___ blank.",
    "Third sentence with ___ blank.",
    "Fourth sentence with ___ blank.",
    "Fifth sentence with ___ blank."
  ],
  "answers": ["answer1", "answer2", "answer3", "answer4", "answer5"],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script must be a realistic, natural dialogue of about 45 seconds when spoken aloud.
- The display_sentences must have exactly 5 sentences, each with one blank marked as ___.
- The answers array must have exactly 5 answers matching the blanks in order.
- The blanks in the sentences should be completable from information in the dialogue.
- Return ONLY the JSON object, nothing else."""

    for attempt in range(1, max_retries + 1):
        try:
            print(f"  Calling Groq/Llama-3.3-70B (attempt {attempt}/{max_retries})...")
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are an IELTS content generator. Return ONLY valid JSON, no markdown fences or extra text."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=2048,
            )
            raw = response.choices[0].message.content.strip()

            # Strip markdown code fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            data = json.loads(raw)

            # Validate required keys
            required = ["title", "scenario_description", "audio_script",
                        "display_sentences", "answers", "voice_accent"]
            for key in required:
                if key not in data:
                    raise ValueError(f"Missing key: {key}")

            if len(data["display_sentences"]) != 5 or len(data["answers"]) != 5:
                raise ValueError("Need exactly 5 sentences and 5 answers")

            print("  Content generated successfully via Groq.")
            return data

        except (json.JSONDecodeError, ValueError) as e:
            print(f"  Attempt {attempt} failed: {e}")
            if attempt == max_retries:
                print("ERROR: Failed to get valid JSON after retries.")
                sys.exit(1)

        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate" in err_str.lower() or "quota" in err_str.lower():
                wait_secs = 10 * attempt
                print(f"  Rate limited. Waiting {wait_secs}s before retry...")
                time.sleep(wait_secs)
                if attempt == max_retries:
                    print("ERROR: Rate limit exceeded after all retries.")
                    sys.exit(1)
            else:
                print(f"  Unexpected error: {e}")
                if attempt == max_retries:
                    print("ERROR: LLM call failed after retries.")
                    sys.exit(1)

    return {}  # unreachable


# ── Audio ──────────────────────────────────────────────────────────────────────
def generate_audio(script: str, accent: str, output_path: Path) -> float:
    """Generate TTS audio and return duration in seconds."""
    # Clean speaker labels for more natural TTS
    clean_script = script.replace("Speaker A:", "").replace("Speaker B:", "\n")
    clean_script = re.sub(r"\n{2,}", "\n", clean_script).strip()

    lang = "en"
    tld = "co.uk" if "GB" in accent else "com"

    print("  Generating audio with gTTS...")
    tts = gTTS(text=clean_script, lang=lang, tld=tld)
    tts.save(str(output_path))

    audio = MP3(str(output_path))
    duration = audio.info.length
    print(f"  Audio duration: {duration:.1f}s")
    return duration


# ── Remotion Renderer ──────────────────────────────────────────────────────────
def render_with_remotion(content: dict, duration: float, audio_path: Path, output_path: Path):
    """Render video using Remotion CLI with embedded audio."""

    # 1. Copy audio to Remotion's public/ directory
    audio_filename = f"audio_{content.get('entry_id', 'temp')}.mp3"
    target_audio = REMOTION_PUBLIC / audio_filename
    shutil.copy2(str(audio_path), str(target_audio))
    print(f"  Audio copied to Remotion public/{audio_filename}")

    # 2. Write props as JSON file (Windows-safe, avoids shell quoting issues)
    props = {
        "sentences": content["display_sentences"],
        "answers": content["answers"],
        "category": content.get("category", ""),
        "scenarioDescription": content["scenario_description"],
        "durationSeconds": round(duration, 2),
        "audioFileName": audio_filename,
    }
    props_file = REMOTION_DIR / "input-props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False)
    print(f"  Props written to input-props.json")

    # 3. Call Remotion CLI render
    cmd = [
        "npx", "remotion", "render",
        "src/index.ts",
        "SentenceCompletion",
        str(output_path),
        "--props", str(props_file),
        "--codec", "h264",
    ]

    print(f"  Rendering with Remotion (1080x1920, 30fps)...")
    result = subprocess.run(
        cmd,
        cwd=str(REMOTION_DIR),
        capture_output=True,
        text=True,
        shell=True,  # Required on Windows for npx
        timeout=600,  # 10-minute timeout for longer videos
    )

    if result.returncode != 0:
        print(f"Remotion render error:\n{result.stderr}")
        # Also print stdout for debugging
        if result.stdout:
            print(f"Remotion stdout:\n{result.stdout}")
        sys.exit(1)

    print(f"  Video rendered: {output_path.name}")

    # 4. Clean up temporary files in Remotion project
    if target_audio.exists():
        target_audio.unlink()
    if props_file.exists():
        props_file.unlink()


# ── Content Plan Helpers ───────────────────────────────────────────────────────
def load_plan() -> list[dict]:
    with open(CONTENT_PLAN, "r", encoding="utf-8") as f:
        return json.load(f)


def save_plan(plan: list[dict]):
    with open(CONTENT_PLAN, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)


def get_next_unused(plan: list[dict]) -> dict | None:
    for entry in plan:
        if not entry["used"]:
            return entry
    return None


def mark_used(plan: list[dict], entry_id: int):
    for entry in plan:
        if entry["id"] == entry_id:
            entry["used"] = True
            break
    save_plan(plan)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="IELTS Sentence Completion Reel Generator (Remotion)")
    parser.add_argument("--preview", action="store_true",
                        help="Launch Remotion Studio for interactive preview")
    parser.add_argument("--test", action="store_true",
                        help="Use sample data instead of calling Groq (for testing)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Pick next unused entry
    plan = load_plan()
    entry = get_next_unused(plan)
    if entry is None:
        print("All content plan entries have been used!")
        sys.exit(0)

    entry_id = entry["id"]
    category = entry["category"]
    scenario = entry["scenario"]
    print(f"\n{'='*60}")
    print(f"  Reel #{entry_id}: [{category}] {scenario}")
    print(f"{'='*60}\n")

    # 2. Generate content with Groq LLM (or use sample in test mode)
    if args.test:
        print("  [TEST MODE] Using sample content (skipping LLM).")
        content = SAMPLE_CONTENT.copy()
    else:
        content = generate_content_with_llm(scenario, category)
    content["category"] = category
    content["entry_id"] = entry_id

    # 3. Generate audio
    audio_path = BASE_DIR / "temp_audio.mp3"
    duration = generate_audio(content["audio_script"], content["voice_accent"], audio_path)

    # 4. Preview mode — launch Remotion Studio
    if args.preview:
        # Copy audio and write props for studio preview
        audio_filename = f"audio_{entry_id}.mp3"
        shutil.copy2(str(audio_path), str(REMOTION_PUBLIC / audio_filename))
        props = {
            "sentences": content["display_sentences"],
            "answers": content["answers"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
        }
        props_file = REMOTION_DIR / "input-props.json"
        with open(props_file, "w", encoding="utf-8") as f:
            json.dump(props, f, ensure_ascii=False)
        print("\n  [PREVIEW MODE] Launching Remotion Studio...")
        print(f"  Props saved. Open Studio and use --props input-props.json")
        subprocess.Popen(
            ["npx", "remotion", "studio", "src/index.ts"],
            cwd=str(REMOTION_DIR),
            shell=True,  # Required on Windows for npx
        )
        return

    # 5. Render video with Remotion
    date_str = datetime.now().strftime("%Y%m%d")
    final_name = f"sentence_completion_{entry_id}_{date_str}.mp4"
    final_path = OUTPUT_DIR / final_name
    render_with_remotion(content, duration, audio_path, final_path)

    # 6. Clean up temp audio
    if audio_path.exists():
        audio_path.unlink()
    print("  Temp files cleaned up.")

    # 7. Mark entry as used
    mark_used(plan, entry_id)
    print(f"  Content plan entry #{entry_id} marked as used.")

    print(f"\n  DONE! Output: {final_path}\n")


if __name__ == "__main__":
    main()
