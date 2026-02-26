#!/usr/bin/env python3
"""
Quick test: generate a single MCQ Single reel using the new large-text
sample content (short question + short options) to see how it looks
on the 1080x1920 canvas.

Usage:  python test_large_text_sample.py
"""

import asyncio
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from config import BASE_DIR, REMOTION_DIR, REMOTION_PUBLIC, OUTPUT_DIR, FPS, CTA_VIDEO
from generate_reel import (
    generate_audio,
    render_with_remotion,
    extract_thumbnail,
    append_cta,
    HOOK_INTRO_DURATION,
)

# ── New large-text sample content ──────────────────────────────────────────────
SAMPLE_CONTENT = {
    "title": "Multiple Choice",
    "header_text": "IELTS 6 listening",
    "scenario_description": "A student talks about her trip",
    "audio_script": (
        "Speaker A: So how long were you in Australia altogether? "
        "Speaker B: Well, I spent the first six months studying in Melbourne, "
        "and then I stayed on for another six months doing an internship in Sydney."
    ),
    "question": "How long did she stay in Australia?",
    "options": [
        "6 months",
        "12 months",
        "18 months",
    ],
    "correct_index": 1,
    "voice_accent": "en-GB",
    "category": "Travel",
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    content = SAMPLE_CONTENT.copy()
    entry_id = "largetext_test"

    print("\n" + "=" * 60)
    print("  TEST: Large-text MCQ Single sample")
    print("=" * 60)

    # 1. Generate audio
    print("\n[1/4] Generating audio...")
    audio_path = BASE_DIR / "temp_audio_test.mp3"
    duration = generate_audio(
        content["audio_script"],
        content["voice_accent"],
        audio_path,
    )
    print(f"  Audio duration: {duration:.1f}s")

    # 2. Build Remotion props (mirroring MCQSingleGenerator.build_remotion_props)
    props = {
        "question": content["question"],
        "options": content["options"],
        "correctIndex": content["correct_index"],
        "category": content["category"],
        "scenarioDescription": content["scenario_description"],
        "durationSeconds": round(duration + 4, 2),
        "audioDurationSeconds": round(duration, 2),
        "audioFileName": f"audio_{entry_id}.mp3",
        "examType": "IELTS",
    }

    # Inject hook intro
    if HOOK_INTRO_DURATION > 0:
        props["hookIntroDuration"] = HOOK_INTRO_DURATION
        props["questionTypeLabel"] = "Multiple Choice"
        props["durationSeconds"] = round(props["durationSeconds"] + HOOK_INTRO_DURATION, 2)

    print(f"\n[2/4] Remotion props:")
    print(f"  question     ({len(content['question'])} chars): {content['question']}")
    for i, opt in enumerate(content["options"]):
        print(f"  option {chr(65+i)}     ({len(opt)} chars): {opt}")
    print(f"  total duration: {props['durationSeconds']}s")

    # 3. Render video
    print("\n[3/4] Rendering with Remotion...")
    date_str = datetime.now().strftime("%Y%m%d")
    final_name = f"mcq_single_largetext_test_{date_str}.mp4"
    final_path = OUTPUT_DIR / final_name

    render_with_remotion(
        composition_id="MCQSingle",
        props=props,
        audio_path=audio_path,
        output_path=final_path,
        entry_id=entry_id,
    )

    # 4. Clean up temp audio
    if audio_path.exists():
        audio_path.unlink()

    # 4b. Append CTA if available
    if CTA_VIDEO.exists():
        final_path = append_cta(final_path)
    else:
        print("  (CTA video not found, skipping append)")

    # 4c. Extract thumbnail
    thumb = extract_thumbnail(final_path, timestamp=3.0)

    # Done
    size_mb = final_path.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 60)
    print(f"  DONE! Video: {final_path}")
    print(f"  Size: {size_mb:.1f} MB")
    if thumb:
        print(f"  Thumbnail: {thumb}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
