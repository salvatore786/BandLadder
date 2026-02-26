#!/usr/bin/env python3
"""
Upload generated reels + captions + thumbnails to Google Drive via n8n webhook.
No local Google auth needed - uses n8n's Google Drive credential.

Usage:
  python upload_to_drive.py                    # Upload all unposted videos
  python upload_to_drive.py --file video.mp4   # Upload specific video
"""

import argparse
import json
import subprocess
import sys
import datetime
import urllib.parse
from pathlib import Path

import requests
import time

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
CUE_CARD_OUTPUT_DIR = BASE_DIR / "output" / "cue_cards"
CLEAN_MCQ_OUTPUT_DIR = BASE_DIR / "output" / "clean_mcq"
CAPTIONS_DIR = BASE_DIR / "content" / "captions"
THUMBNAILS_DIR = BASE_DIR / "content" / "thumbnails"
UPLOAD_LOG = BASE_DIR / "content" / "upload_log.json"

# n8n webhook URL for uploading reels to Google Drive
N8N_UPLOAD_URL = "https://n8n.srv1258291.hstgr.cloud/webhook/upload-reel"


def load_upload_log():
    if UPLOAD_LOG.exists():
        with open(UPLOAD_LOG, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_upload_log(log):
    UPLOAD_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(UPLOAD_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


def get_unuploaded_videos():
    """Get list of videos not yet uploaded to Drive (both output dirs)."""
    log = load_upload_log()
    uploaded_files = {entry["video_file"] for entry in log}
    skip_names = {"test_remotion.mp4"}
    unuploaded = []

    # Main output directory (listening reels)
    if OUTPUT_DIR.exists():
        for f in sorted(OUTPUT_DIR.glob("*.mp4")):
            if f.name not in uploaded_files and f.name not in skip_names:
                unuploaded.append(f)

    # Cue card output directory
    if CUE_CARD_OUTPUT_DIR.exists():
        for f in sorted(CUE_CARD_OUTPUT_DIR.glob("*.mp4")):
            if f.name not in uploaded_files and f.name not in skip_names:
                unuploaded.append(f)

    # Clean MCQ output directory (Batch 3)
    if CLEAN_MCQ_OUTPUT_DIR.exists():
        for f in sorted(CLEAN_MCQ_OUTPUT_DIR.glob("*.mp4")):
            if f.name not in uploaded_files and f.name not in skip_names:
                unuploaded.append(f)

    return unuploaded


def extract_thumbnail(video_path: Path, timestamp: float = 3.0) -> Path | None:
    """Extract a thumbnail from a video using ffmpeg (for videos without one)."""
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
    thumb_name = video_path.stem + "_thumb.jpg"
    thumb_path = THUMBNAILS_DIR / thumb_name

    if thumb_path.exists():
        return thumb_path

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", str(video_path),
        "-frames:v", "1",
        "-q:v", "2",
        str(thumb_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode == 0 and thumb_path.exists():
        return thumb_path
    return None


MAX_RETRIES = 3
RETRY_BACKOFF = [10, 30, 60]  # seconds between retries


def upload_file(file_path, caption_text=""):
    """Upload a video file to Google Drive via n8n webhook (with retry)."""
    video_path = Path(file_path)
    file_size_mb = video_path.stat().st_size / (1024 * 1024)

    headers = {
        "x-filename": video_path.name,
        "x-caption": urllib.parse.quote(caption_text[:3000]) if caption_text else "",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            label = f" (retry {attempt}/{MAX_RETRIES})" if attempt > 0 else ""
            print(f"  Uploading {video_path.name} ({file_size_mb:.1f} MB){label}...", end=" ", flush=True)

            with open(video_path, "rb") as f:
                resp = requests.post(
                    N8N_UPLOAD_URL,
                    headers=headers,
                    data=f.read(),
                    timeout=300,
                )

            if resp.status_code == 200:
                result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                file_id = result.get("id", "uploaded")
                print(f"Done! (ID: {file_id})")
                return file_id
            else:
                print(f"FAILED! Status: {resp.status_code}")
                print(f"  Response: {resp.text[:300]}")
                # Don't retry on 4xx client errors
                if 400 <= resp.status_code < 500:
                    return None

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.SSLError) as e:
            print(f"NETWORK ERROR: {type(e).__name__}")

        # Retry with backoff
        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF[attempt]
            print(f"  Retrying in {wait}s...")
            time.sleep(wait)

    print(f"  GAVE UP after {MAX_RETRIES} retries for {video_path.name}")
    return None


def upload_thumbnail(video_path: Path) -> str | None:
    """Upload matching thumbnail to Google Drive. Returns file ID or None."""
    # Check for existing thumbnail
    thumb_path = THUMBNAILS_DIR / f"{video_path.stem}_thumb.jpg"

    # If no thumbnail exists, extract one from the video
    if not thumb_path.exists():
        print(f"  Extracting thumbnail for {video_path.name}...", end=" ", flush=True)
        thumb_path = extract_thumbnail(video_path)
        if not thumb_path:
            print("Failed!")
            return None
        print("OK")

    size_kb = thumb_path.stat().st_size / 1024

    headers = {
        "x-filename": thumb_path.name,
        "x-caption": "",  # no caption for thumbnails
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            label = f" (retry {attempt}/{MAX_RETRIES})" if attempt > 0 else ""
            print(f"  Uploading thumbnail {thumb_path.name} ({size_kb:.0f} KB){label}...", end=" ", flush=True)

            with open(thumb_path, "rb") as f:
                resp = requests.post(
                    N8N_UPLOAD_URL,
                    headers=headers,
                    data=f.read(),
                    timeout=60,
                )

            if resp.status_code == 200:
                result = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                file_id = result.get("id", "uploaded")
                print(f"Done! (ID: {file_id})")
                return file_id
            else:
                print(f"FAILED! Status: {resp.status_code}")
                if 400 <= resp.status_code < 500:
                    return None

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.SSLError) as e:
            print(f"NETWORK ERROR: {type(e).__name__}")

        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF[attempt]
            print(f"  Retrying in {wait}s...")
            time.sleep(wait)

    print(f"  GAVE UP thumbnail after {MAX_RETRIES} retries")
    return None


def upload_all():
    """Upload all unuploaded videos + thumbnails to Google Drive."""
    unuploaded = get_unuploaded_videos()
    if not unuploaded:
        print("No new videos to upload.")
        return 0

    print(f"Found {len(unuploaded)} videos to upload.\n")
    log = load_upload_log()
    uploaded_count = 0

    for video_path in unuploaded:
        # Get caption
        caption_path = CAPTIONS_DIR / f"{video_path.stem}_caption.txt"
        caption = caption_path.read_text(encoding="utf-8") if caption_path.exists() else ""

        try:
            # Upload video
            file_id = upload_file(video_path, caption)
            if file_id:
                # Upload thumbnail
                thumb_id = upload_thumbnail(video_path)

                log.append({
                    "video_file": video_path.name,
                    "drive_file_id": file_id,
                    "thumb_file_id": thumb_id or "",
                    "caption": caption[:200] + "..." if len(caption) > 200 else caption,
                    "uploaded_at": datetime.datetime.now().isoformat(),
                })
                save_upload_log(log)
                uploaded_count += 1
        except Exception as e:
            print(f"  ERROR uploading {video_path.name}: {e}")

    print(f"\nUploaded {uploaded_count}/{len(unuploaded)} videos to Google Drive.")
    return uploaded_count


def main():
    parser = argparse.ArgumentParser(description="Upload reels to Google Drive via n8n")
    parser.add_argument("--file", help="Specific video file to upload")
    args = parser.parse_args()

    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            file_path = OUTPUT_DIR / args.file
        if not file_path.exists():
            print(f"ERROR: File not found: {args.file}")
            sys.exit(1)

        caption_path = CAPTIONS_DIR / f"{file_path.stem}_caption.txt"
        caption = caption_path.read_text(encoding="utf-8") if caption_path.exists() else ""
        upload_file(file_path, caption)
        upload_thumbnail(file_path)
    else:
        upload_all()


if __name__ == "__main__":
    main()
