#!/usr/bin/env python3
"""
Scheduled Reel Poster — Posts generated reels at spaced intervals.
Finds unposted videos in output/ and posts them with their captions.
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path

from config import BASE_DIR, OUTPUT_DIR, CAPTIONS_DIR
from post_to_instagram import post_and_log, load_post_log

# Logging
LOG_FILE = BASE_DIR / "reel_scheduler.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def get_unposted_videos() -> list[Path]:
    """Find MP4 files in output/ that haven't been posted yet."""
    if not OUTPUT_DIR.exists():
        return []

    post_log = load_post_log()
    posted_files = {entry["video_file"] for entry in post_log if entry.get("status") == "success"}

    unposted = []
    for f in sorted(OUTPUT_DIR.glob("*.mp4")):
        if f.name not in posted_files and f.name != "test_remotion.mp4":
            unposted.append(f)

    return unposted


def main():
    parser = argparse.ArgumentParser(description="Post reels at scheduled intervals")
    parser.add_argument(
        "--interval-hours",
        type=float,
        default=4.0,
        help="Hours between each post (default: 4)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=4,
        help="Number of reels to post (default: 4)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be posted without actually posting",
    )
    args = parser.parse_args()

    unposted = get_unposted_videos()
    if not unposted:
        logger.info("No unposted videos found. Nothing to do.")
        sys.exit(0)

    to_post = unposted[: args.count]
    logger.info(f"Found {len(unposted)} unposted videos. Will post {len(to_post)} at {args.interval_hours}h intervals.")

    for i, video_path in enumerate(to_post):
        # Find matching caption
        caption_file = CAPTIONS_DIR / f"{video_path.stem}_caption.txt"

        if args.dry_run:
            logger.info(f"[DRY RUN] Would post: {video_path.name} (caption: {caption_file.exists()})")
            continue

        if i > 0:
            wait_seconds = args.interval_hours * 3600
            logger.info(f"Sleeping {args.interval_hours}h until next post...")
            time.sleep(wait_seconds)

        logger.info(f"Posting {i + 1}/{len(to_post)}: {video_path.name}")

        try:
            success = post_and_log(
                str(video_path),
                caption_path=str(caption_file) if caption_file.exists() else None,
            )
            if success:
                logger.info(f"SUCCESS: {video_path.name}")
            else:
                logger.error(f"FAILED: {video_path.name}")
        except Exception as e:
            logger.error(f"ERROR posting {video_path.name}: {e}")

    logger.info("Scheduling complete.")


if __name__ == "__main__":
    main()
