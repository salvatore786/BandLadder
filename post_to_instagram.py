#!/usr/bin/env python3
"""
Instagram Reel Poster — Posts video reels with captions to Instagram.
Uses instagrapi library for uploading.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from config import BASE_DIR, OUTPUT_DIR

POST_LOG = BASE_DIR / "content" / "post_log.json"
SESSION_FILE = BASE_DIR / ".instagram_session.json"


def load_post_log() -> list[dict]:
    if POST_LOG.exists():
        with open(POST_LOG, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_post_log(log: list[dict]):
    POST_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(POST_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


def get_credentials() -> tuple[str, str]:
    username = os.environ.get("INSTAGRAM_USERNAME")
    password = os.environ.get("INSTAGRAM_PASSWORD")
    if not username or not password:
        print("ERROR: Set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables.")
        sys.exit(1)
    return username, password


def post_reel(video_path: str, caption: str) -> str:
    """Post a reel to Instagram. Returns media ID."""
    from instagrapi import Client

    username, password = get_credentials()
    cl = Client()

    # Session persistence
    if SESSION_FILE.exists():
        try:
            cl.load_settings(str(SESSION_FILE))
            cl.login(username, password)
            print("  Logged in using saved session.")
        except Exception:
            print("  Saved session expired. Logging in fresh...")
            cl.login(username, password)
            cl.dump_settings(str(SESSION_FILE))
    else:
        cl.login(username, password)
        cl.dump_settings(str(SESSION_FILE))
        print("  Logged in and saved session.")

    print(f"  Uploading reel: {Path(video_path).name}")
    media = cl.clip_upload(
        path=video_path,
        caption=caption,
    )
    media_id = str(media.pk)
    print(f"  Posted! Media ID: {media_id}")
    return media_id


def post_and_log(video_path: str, caption_path: str | None = None, caption_text: str | None = None):
    """Post a reel and log the result."""
    video_file = Path(video_path)
    if not video_file.exists():
        print(f"ERROR: Video not found: {video_path}")
        sys.exit(1)

    # Get caption
    if caption_text:
        caption = caption_text
    elif caption_path:
        caption = Path(caption_path).read_text(encoding="utf-8")
    else:
        # Try to find matching caption file
        caption_file = BASE_DIR / "content" / "captions" / f"{video_file.stem}_caption.txt"
        if caption_file.exists():
            caption = caption_file.read_text(encoding="utf-8")
            print(f"  Found caption: {caption_file.name}")
        else:
            caption = "🎧 Practice your listening skills! Follow @bandladder for daily practice! 💪\n\n#IELTS #BandLadder #IELTSPreparation"
            print("  Using default caption (no caption file found).")

    # Post
    try:
        media_id = post_reel(str(video_file), caption)
        status = "success"
    except Exception as e:
        print(f"  ERROR posting: {e}")
        media_id = None
        status = f"failed: {e}"

    # Log
    log = load_post_log()
    log.append({
        "video_file": video_file.name,
        "media_id": media_id,
        "caption": caption[:200] + "..." if len(caption) > 200 else caption,
        "posted_at": datetime.now().isoformat(),
        "status": status,
    })
    save_post_log(log)

    return status == "success"


def main():
    parser = argparse.ArgumentParser(description="Post a reel to Instagram")
    parser.add_argument("--video", required=True, help="Path to MP4 video file")
    parser.add_argument("--caption", help="Caption text or path to caption file")
    args = parser.parse_args()

    caption_text = None
    caption_path = None
    if args.caption:
        if Path(args.caption).exists():
            caption_path = args.caption
        else:
            caption_text = args.caption

    success = post_and_log(args.video, caption_path=caption_path, caption_text=caption_text)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
