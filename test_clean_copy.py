#!/usr/bin/env python3
"""
Test: Render an exact copy of the reference IELTS 6 listening reel
using the MCQSingleClean composition (black bg + white card, no branding).
Hook & CTA use the same clean black+card visual style.
"""

import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from config import BASE_DIR, REMOTION_DIR, REMOTION_PUBLIC, OUTPUT_DIR, FPS
from generate_reel import generate_audio

# ── Exact content from the reference video ─────────────────────────────────
SAMPLE = {
    "audio_script": (
        "Speaker A: So how long were you in Australia altogether? "
        "Speaker B: Well, I spent the first six months studying in Melbourne, "
        "and then I stayed on for another six months doing an internship in Sydney."
    ),
    "voice_accent": "en-GB",
}

HOOK_DURATION = 3   # seconds
CTA_DURATION = 5    # seconds

PROPS = {
    "headerText": "IELTS 6 listening",
    "question": "How long the girl stayed in Australia ___ ?",
    "options": [
        "A. 6 months",
        "B. 12 months",
        "C. 18 months",
    ],
    "correctIndex": 1,
    # Hook — same black+card style + hook_intro_sound.mp3
    "hookDuration": HOOK_DURATION,
    "hookText": "Can you answer this?",
    # CTA — same black+card style
    "ctaDuration": CTA_DURATION,
    "ctaLine1": "For more practice,",
    "ctaLine2": "follow BandLadder",
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    entry_id = "clean_copy_test"

    print("\n" + "=" * 60)
    print("  TEST: Clean MCQ Single reel (inline hook + CTA)")
    print("=" * 60)

    # 1. Generate audio
    print("\n[1/3] Generating audio...")
    audio_path = BASE_DIR / "temp_audio_clean.mp3"
    duration = generate_audio(
        SAMPLE["audio_script"],
        SAMPLE["voice_accent"],
        audio_path,
    )
    print(f"  Audio duration: {duration:.1f}s")

    # 2. Build props
    props = {
        **PROPS,
        # total = hook(5) + main content(audio + 6s reveal/buffer) + CTA(5)
        "durationSeconds": round(HOOK_DURATION + duration + 6 + CTA_DURATION, 2),
        "audioDurationSeconds": round(duration, 2),
        "audioFileName": f"audio_{entry_id}.mp3",
    }

    print(f"\n[2/3] Props:")
    print(f"  header:   {props['headerText']}")
    print(f"  question: {props['question']}")
    for opt in props["options"]:
        print(f"  option:   {opt}")
    print(f"  hook:     {props['hookDuration']}s — \"{props['hookText']}\"")
    print(f"  cta:      {props['ctaDuration']}s — \"{props['ctaLine1']}\" / \"{props['ctaLine2']}\"")
    print(f"  total:    {props['durationSeconds']}s")

    # 3. Render
    print("\n[3/3] Rendering with Remotion (MCQSingleClean)...")

    # Copy audio to Remotion public/
    audio_filename = f"audio_{entry_id}.mp3"
    target_audio = REMOTION_PUBLIC / audio_filename
    shutil.copy2(str(audio_path), str(target_audio))

    # Write props
    props_file = REMOTION_DIR / "input-props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False)

    # Render
    date_str = datetime.now().strftime("%Y%m%d")
    final_name = f"mcq_clean_copy_{date_str}.mp4"
    final_path = OUTPUT_DIR / final_name

    cmd = [
        "npx", "remotion", "render",
        "src/index.ts",
        "MCQSingleClean",
        str(final_path),
        "--props", str(props_file),
        "--codec", "h264",
    ]

    result = subprocess.run(
        cmd,
        cwd=str(REMOTION_DIR),
        capture_output=True,
        text=True,
        shell=True,
        timeout=600,
    )

    if result.returncode != 0:
        print(f"Remotion error:\n{result.stderr}")
        if result.stdout:
            print(f"stdout:\n{result.stdout}")
        raise RuntimeError("Render failed")

    print(f"  Video rendered: {final_path.name}")

    # Cleanup
    if audio_path.exists():
        audio_path.unlink()
    if target_audio.exists():
        target_audio.unlink()
    if props_file.exists():
        props_file.unlink()

    size_mb = final_path.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 60)
    print(f"  DONE! Video: {final_path}")
    print(f"  Size: {size_mb:.1f} MB")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
