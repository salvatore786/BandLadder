#!/usr/bin/env python3
"""
BandLadder Daily Pipeline — Generate 19 reels + Upload to Google Drive

This script runs once daily (e.g., 5:30 AM IST via Windows Task Scheduler).
It generates reels in three batches and uploads them all to Google Drive:
  Batch 1: 9 listening reels (diverse types from main content plan)
  Batch 2: 5 cue card / speaking reels (from cue_card content plan)
  Batch 3: 5 clean MCQ single reels (from clean_mcq content plan)
The n8n workflow then posts them throughout the day (19 posts).

Pipeline:
  1a. Generate 9 listening reels (round-robin from content plan)
  1b. Generate 5 cue card reels (from cue_card content plan)
  1c. Generate 5 clean MCQ reels (from clean_mcq content plan)
  2.  Upload all new reels to Google Drive via n8n webhook
  3.  Clean up uploaded videos from local output/ folder

Usage:
  python run_daily_pipeline.py            # Full pipeline (9 + 5 + 5 = 19)
  python run_daily_pipeline.py --dry-run  # Show what would happen (no generation)
  python run_daily_pipeline.py --count 4  # Override listening reel count
  python run_daily_pipeline.py --cue-card-count 3  # Override cue card count
  python run_daily_pipeline.py --clean-mcq-count 3 # Override clean MCQ count
  python run_daily_pipeline.py --skip-cleanup  # Don't delete local files after upload
"""

import argparse
import json
import subprocess
import sys
import time
import logging
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
CUE_CARD_OUTPUT_DIR = BASE_DIR / "output" / "cue_cards"
CLEAN_MCQ_OUTPUT_DIR = BASE_DIR / "output" / "clean_mcq"
CAPTIONS_DIR = BASE_DIR / "content" / "captions"
CONTENT_PLAN = BASE_DIR / "content" / "content_plan.json"
CUE_CARD_CONTENT_PLAN = BASE_DIR / "content" / "cue_card_content_plan.json"
CLEAN_MCQ_CONTENT_PLAN = BASE_DIR / "content" / "clean_mcq_content_plan.json"
UPLOAD_LOG = BASE_DIR / "content" / "upload_log.json"
DAILY_LOG = BASE_DIR / "logs" / "daily_pipeline.log"

# Ensure logs directory exists
DAILY_LOG.parent.mkdir(parents=True, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(DAILY_LOG, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("daily_pipeline")


def count_unused_entries(plan_path: Path = CONTENT_PLAN) -> dict:
    """Count unused content plan entries by type."""
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)
    counts = {}
    for entry in plan:
        if not entry["used"]:
            qtype = entry["question_type"]
            counts[qtype] = counts.get(qtype, 0) + 1
    return counts


def get_today_videos() -> list[Path]:
    """Get videos generated today (by date in filename) from all output dirs."""
    today = datetime.now().strftime("%Y%m%d")
    skip_prefixes = ("cta_", "hook_", "full_reel", "test_")
    videos = []

    # Main output directory (listening reels)
    if OUTPUT_DIR.exists():
        videos.extend(
            f for f in OUTPUT_DIR.glob(f"*_{today}.mp4")
            if not f.name.startswith(skip_prefixes)
        )

    # Cue card output directory
    if CUE_CARD_OUTPUT_DIR.exists():
        videos.extend(
            f for f in CUE_CARD_OUTPUT_DIR.glob(f"*_{today}.mp4")
            if not f.name.startswith(skip_prefixes)
        )

    # Clean MCQ output directory
    if CLEAN_MCQ_OUTPUT_DIR.exists():
        videos.extend(
            f for f in CLEAN_MCQ_OUTPUT_DIR.glob(f"*_{today}.mp4")
            if not f.name.startswith(skip_prefixes)
        )

    return sorted(videos)


def get_already_uploaded() -> set[str]:
    """Get set of filenames already uploaded to Drive."""
    if UPLOAD_LOG.exists():
        with open(UPLOAD_LOG, "r", encoding="utf-8") as f:
            log_data = json.load(f)
        return {entry["video_file"] for entry in log_data}
    return set()


def step_generate(count: int, dry_run: bool = False) -> list[Path]:
    """Step 1a: Generate listening reels using generate_reel.py --batch."""
    log.info(f"{'[DRY RUN] ' if dry_run else ''}STEP 1a: Generating {count} listening reels...")

    # Check content plan
    unused = count_unused_entries()
    total_unused = sum(unused.values())
    log.info(f"  Content plan: {total_unused} unused entries across {len(unused)} types")
    for qtype, cnt in sorted(unused.items()):
        log.info(f"    {qtype}: {cnt} remaining")

    if total_unused < count:
        log.warning(f"  Only {total_unused} entries available, reducing batch to {total_unused}")
        count = total_unused

    if total_unused == 0:
        log.error("  No unused entries left in content plan! Add more entries.")
        return []

    if dry_run:
        log.info(f"  [DRY RUN] Would generate {count} reels. Skipping.")
        return get_today_videos()

    # Run the generator
    cmd = [sys.executable, str(BASE_DIR / "generate_reel.py"), "--batch", str(count)]
    log.info(f"  Running: {' '.join(cmd)}")

    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        timeout=3600,  # 1 hour timeout for 9 reels
    )
    elapsed = time.time() - start

    if result.returncode != 0:
        log.error(f"  Generation FAILED after {elapsed:.0f}s!")
        log.error(f"  stderr: {result.stderr[-500:]}")
        # Still check for partial success
        videos = get_today_videos()
        if videos:
            log.info(f"  Partial success: {len(videos)} videos generated before failure")
        return videos

    log.info(f"  Generation completed in {elapsed:.0f}s ({elapsed/60:.1f} min)")

    # Get generated videos
    videos = get_today_videos()
    log.info(f"  Generated {len(videos)} videos for today")
    for v in videos:
        size_mb = v.stat().st_size / (1024 * 1024)
        log.info(f"    {v.name} ({size_mb:.1f} MB)")

    return videos


def step_generate_cue_cards(count: int, dry_run: bool = False) -> list[Path]:
    """Step 1b: Generate cue card reels using generate_reel.py --batch N --type cue_card."""
    log.info(f"{'[DRY RUN] ' if dry_run else ''}STEP 1b: Generating {count} cue card reels...")

    # Check cue card content plan
    if not CUE_CARD_CONTENT_PLAN.exists():
        log.error("  Cue card content plan not found! Skipping cue card batch.")
        return []

    unused = count_unused_entries(CUE_CARD_CONTENT_PLAN)
    total_unused = sum(unused.values())
    log.info(f"  Cue card plan: {total_unused} unused entries")

    if total_unused < count:
        log.warning(f"  Only {total_unused} cue card entries available, reducing batch to {total_unused}")
        count = total_unused

    if total_unused == 0:
        log.error("  No unused cue card entries! Add more to cue_card_content_plan.json.")
        return []

    if dry_run:
        log.info(f"  [DRY RUN] Would generate {count} cue card reels. Skipping.")
        today = datetime.now().strftime("%Y%m%d")
        if CUE_CARD_OUTPUT_DIR.exists():
            return sorted(CUE_CARD_OUTPUT_DIR.glob(f"*_{today}.mp4"))
        return []

    # Run the generator with --type cue_card
    cmd = [
        sys.executable, str(BASE_DIR / "generate_reel.py"),
        "--batch", str(count),
        "--type", "cue_card",
    ]
    log.info(f"  Running: {' '.join(cmd)}")

    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        timeout=3600,
    )
    elapsed = time.time() - start

    if result.returncode != 0:
        log.error(f"  Cue card generation FAILED after {elapsed:.0f}s!")
        log.error(f"  stderr: {result.stderr[-500:]}")

    log.info(f"  Cue card generation completed in {elapsed:.0f}s ({elapsed/60:.1f} min)")

    # Get generated cue card videos
    today = datetime.now().strftime("%Y%m%d")
    videos = []
    if CUE_CARD_OUTPUT_DIR.exists():
        videos = sorted(CUE_CARD_OUTPUT_DIR.glob(f"*_{today}.mp4"))
    log.info(f"  Generated {len(videos)} cue card videos for today")
    for v in videos:
        size_mb = v.stat().st_size / (1024 * 1024)
        log.info(f"    {v.name} ({size_mb:.1f} MB)")

    return videos


def step_generate_clean_mcq(count: int, dry_run: bool = False) -> list[Path]:
    """Step 1c: Generate clean MCQ reels using generate_reel.py --batch N --type mcq_single_clean."""
    log.info(f"{'[DRY RUN] ' if dry_run else ''}STEP 1c: Generating {count} clean MCQ reels...")

    # Check clean MCQ content plan
    if not CLEAN_MCQ_CONTENT_PLAN.exists():
        log.error("  Clean MCQ content plan not found! Skipping clean MCQ batch.")
        return []

    unused = count_unused_entries(CLEAN_MCQ_CONTENT_PLAN)
    total_unused = sum(unused.values())
    log.info(f"  Clean MCQ plan: {total_unused} unused entries")

    if total_unused < count:
        log.warning(f"  Only {total_unused} clean MCQ entries available, reducing batch to {total_unused}")
        count = total_unused

    if total_unused == 0:
        log.error("  No unused clean MCQ entries! Add more to clean_mcq_content_plan.json.")
        return []

    if dry_run:
        log.info(f"  [DRY RUN] Would generate {count} clean MCQ reels. Skipping.")
        today = datetime.now().strftime("%Y%m%d")
        if CLEAN_MCQ_OUTPUT_DIR.exists():
            return sorted(CLEAN_MCQ_OUTPUT_DIR.glob(f"*_{today}.mp4"))
        return []

    # Run the generator with --type mcq_single_clean
    cmd = [
        sys.executable, str(BASE_DIR / "generate_reel.py"),
        "--batch", str(count),
        "--type", "mcq_single_clean",
    ]
    log.info(f"  Running: {' '.join(cmd)}")

    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        timeout=3600,
    )
    elapsed = time.time() - start

    if result.returncode != 0:
        log.error(f"  Clean MCQ generation FAILED after {elapsed:.0f}s!")
        log.error(f"  stderr: {result.stderr[-500:]}")

    log.info(f"  Clean MCQ generation completed in {elapsed:.0f}s ({elapsed/60:.1f} min)")

    # Get generated clean MCQ videos
    today = datetime.now().strftime("%Y%m%d")
    videos = []
    if CLEAN_MCQ_OUTPUT_DIR.exists():
        videos = sorted(CLEAN_MCQ_OUTPUT_DIR.glob(f"*_{today}.mp4"))
    log.info(f"  Generated {len(videos)} clean MCQ videos for today")
    for v in videos:
        size_mb = v.stat().st_size / (1024 * 1024)
        log.info(f"    {v.name} ({size_mb:.1f} MB)")

    return videos


def step_upload(videos: list[Path], dry_run: bool = False) -> int:
    """Step 2: Upload videos to Google Drive via n8n webhook."""
    if not videos:
        log.info("STEP 2: No videos to upload. Skipping.")
        return 0

    # Filter out already uploaded
    uploaded = get_already_uploaded()
    to_upload = [v for v in videos if v.name not in uploaded]

    if not to_upload:
        log.info("STEP 2: All videos already uploaded. Skipping.")
        return 0

    log.info(f"{'[DRY RUN] ' if dry_run else ''}STEP 2: Uploading {len(to_upload)} videos to Google Drive...")

    if dry_run:
        for v in to_upload:
            log.info(f"  [DRY RUN] Would upload: {v.name}")
        return 0

    # Use upload_to_drive.py for the actual upload
    cmd = [sys.executable, str(BASE_DIR / "upload_to_drive.py")]
    log.info(f"  Running: {' '.join(cmd)}")

    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        timeout=600,  # 10 min timeout for uploads
    )
    elapsed = time.time() - start

    # Parse output for upload count
    output = result.stdout
    log.info(f"  Upload output:\n{output}")

    if result.returncode != 0:
        log.error(f"  Upload had errors after {elapsed:.0f}s")
        log.error(f"  stderr: {result.stderr[-300:]}")

    # Count successful uploads
    new_uploaded = get_already_uploaded()
    count = len(new_uploaded) - len(uploaded)
    log.info(f"  Uploaded {count} new videos in {elapsed:.0f}s")

    return count


def step_cleanup(videos: list[Path], dry_run: bool = False) -> int:
    """Step 3: Remove uploaded videos from local output/ to save disk space."""
    uploaded = get_already_uploaded()
    to_clean = [v for v in videos if v.name in uploaded]

    if not to_clean:
        log.info("STEP 3: No videos to clean up.")
        return 0

    log.info(f"{'[DRY RUN] ' if dry_run else ''}STEP 3: Cleaning {len(to_clean)} uploaded videos from local disk...")

    cleaned = 0
    for v in to_clean:
        if dry_run:
            log.info(f"  [DRY RUN] Would delete: {v.name}")
            continue
        try:
            size_mb = v.stat().st_size / (1024 * 1024)
            v.unlink()
            log.info(f"  Deleted: {v.name} ({size_mb:.1f} MB freed)")
            cleaned += 1
        except Exception as e:
            log.error(f"  Failed to delete {v.name}: {e}")

    if not dry_run:
        log.info(f"  Cleaned {cleaned} files")
    return cleaned


def main():
    parser = argparse.ArgumentParser(description="BandLadder Daily Pipeline")
    parser.add_argument("--count", type=int, default=9, help="Number of listening reels (default: 9)")
    parser.add_argument("--cue-card-count", type=int, default=5, help="Number of cue card reels (default: 5)")
    parser.add_argument("--clean-mcq-count", type=int, default=5, help="Number of clean MCQ reels (default: 5)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without doing it")
    parser.add_argument("--skip-cleanup", action="store_true", help="Don't delete local files after upload")
    parser.add_argument("--upload-only", action="store_true", help="Skip generation, just upload existing videos")
    parser.add_argument("--skip-listening", action="store_true", help="Skip listening generation")
    parser.add_argument("--skip-cue-cards", action="store_true", help="Skip cue card generation")
    parser.add_argument("--skip-clean-mcq", action="store_true", help="Skip clean MCQ generation")
    args = parser.parse_args()

    n_listening = 0 if args.skip_listening else args.count
    n_cue = 0 if args.skip_cue_cards else args.cue_card_count
    n_clean = 0 if args.skip_clean_mcq else args.clean_mcq_count
    total_target = n_listening + n_cue + n_clean

    log.info("=" * 60)
    log.info("  BandLadder Daily Pipeline")
    log.info(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log.info(f"  Config: listening={n_listening}, cue_cards={n_cue}, clean_mcq={n_clean}, total={total_target}, dry_run={args.dry_run}")
    log.info("=" * 60)

    start_time = time.time()

    # Step 0: Auto-refill content plans if running low
    if not args.upload_only:
        log.info("STEP 0: Checking content plans for auto-refill...")
        try:
            from refill_content_plan import refill_all_plans
            refill_summary = refill_all_plans(dry_run=args.dry_run)
            for plan_name, info in refill_summary.items():
                if info.get("refilled"):
                    log.info(f"  {plan_name}: Added {info['added']} entries "
                             f"({info['before_unused']} -> {info['after_unused']} unused)")
                elif info.get("would_generate"):
                    log.info(f"  {plan_name}: [DRY RUN] would generate {info['would_generate']}")
                else:
                    log.info(f"  {plan_name}: OK ({info.get('unused', '?')} unused)")
        except Exception as e:
            log.warning(f"  Auto-refill failed (non-fatal): {e}")
            log.warning("  Pipeline continues with existing content plan entries.")

    # Step 1: Generate
    if args.upload_only:
        log.info("STEP 1: Skipped (--upload-only mode)")
        videos = get_today_videos()
        if not videos:
            # If no today's videos, get all unuploaded videos from all dirs
            uploaded = get_already_uploaded()
            skip_prefixes = ("cta_", "hook_", "full_reel", "test_")
            videos = sorted(
                f for f in OUTPUT_DIR.glob("*.mp4")
                if f.name not in uploaded
                and not f.name.startswith(skip_prefixes)
            )
            # Also check cue_cards subfolder
            if CUE_CARD_OUTPUT_DIR.exists():
                videos.extend(sorted(
                    f for f in CUE_CARD_OUTPUT_DIR.glob("*.mp4")
                    if f.name not in uploaded
                    and not f.name.startswith(skip_prefixes)
                ))
            # Also check clean_mcq subfolder
            if CLEAN_MCQ_OUTPUT_DIR.exists():
                videos.extend(sorted(
                    f for f in CLEAN_MCQ_OUTPUT_DIR.glob("*.mp4")
                    if f.name not in uploaded
                    and not f.name.startswith(skip_prefixes)
                ))
        log.info(f"  Found {len(videos)} videos to upload")
    else:
        # Batch 1: Listening reels
        videos_listening = []
        if n_listening > 0:
            videos_listening = step_generate(n_listening, args.dry_run)
        else:
            log.info("STEP 1a: Skipped (--skip-listening or count=0)")

        # Batch 2: Cue card reels
        videos_cuecard = []
        if n_cue > 0:
            videos_cuecard = step_generate_cue_cards(n_cue, args.dry_run)
        else:
            log.info("STEP 1b: Skipped (--skip-cue-cards or count=0)")

        # Batch 3: Clean MCQ reels
        videos_clean_mcq = []
        if n_clean > 0:
            videos_clean_mcq = step_generate_clean_mcq(n_clean, args.dry_run)
        else:
            log.info("STEP 1c: Skipped (--skip-clean-mcq or count=0)")

        videos = videos_listening + videos_cuecard + videos_clean_mcq

    # Step 2: Upload all videos to same Drive folder
    uploaded_count = step_upload(videos, args.dry_run)

    # Step 3: Cleanup
    if not args.skip_cleanup:
        step_cleanup(videos, args.dry_run)
    else:
        log.info("STEP 3: Skipped (--skip-cleanup)")

    # Summary
    elapsed = time.time() - start_time
    n_listening = len([v for v in videos if "cue_card" not in v.name and "mcq_single_clean" not in v.name])
    n_cuecard = len([v for v in videos if "cue_card" in v.name])
    n_clean_mcq = len([v for v in videos if "mcq_single_clean" in v.name])
    log.info("")
    log.info("=" * 60)
    log.info("  PIPELINE COMPLETE")
    log.info(f"  Generated: {len(videos)} videos ({n_listening} listening + {n_cuecard} cue cards + {n_clean_mcq} clean MCQ)")
    log.info(f"  Uploaded:  {uploaded_count} to Google Drive")
    log.info(f"  Duration:  {elapsed:.0f}s ({elapsed/60:.1f} min)")
    log.info(f"  Next: n8n posts throughout the day (19 times/day)")
    log.info("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Catch any unhandled exception so it gets logged
        try:
            log.error(f"UNHANDLED EXCEPTION: {e}", exc_info=True)
        except Exception:
            # If logging itself fails, write directly to file
            import traceback
            with open(DAILY_LOG, "a", encoding="utf-8") as f:
                f.write(f"\n\nUNHANDLED EXCEPTION at {datetime.now()}:\n")
                traceback.print_exc(file=f)
        sys.exit(1)
