"""Central configuration for the IELTS/PTE Reel Generator."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CONTENT_PLAN = BASE_DIR / "content" / "content_plan.json"
CUE_CARD_CONTENT_PLAN = BASE_DIR / "content" / "cue_card_content_plan.json"
CLEAN_MCQ_CONTENT_PLAN = BASE_DIR / "content" / "clean_mcq_content_plan.json"
OUTPUT_DIR = BASE_DIR / "output"
CUE_CARD_OUTPUT_DIR = BASE_DIR / "output" / "cue_cards"
CLEAN_MCQ_OUTPUT_DIR = BASE_DIR / "output" / "clean_mcq"
REMOTION_DIR = BASE_DIR / "remotion-video"
REMOTION_PUBLIC = REMOTION_DIR / "public"
CAPTIONS_DIR = BASE_DIR / "content" / "captions"
CTA_VIDEO = BASE_DIR / "content" / "cta_swipe_voiced.mp4"

# Video settings
FPS = 30
VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920

# ── Auto-Refill Settings ──────────────────────────────────────
REFILL_THRESHOLD_LISTENING = 20    # Trigger refill when < N unused entries
REFILL_THRESHOLD_CUE_CARD = 15
REFILL_THRESHOLD_CLEAN_MCQ = 15

REFILL_BATCH_LISTENING = 30        # How many new entries to generate per refill
REFILL_BATCH_CUE_CARD = 20
REFILL_BATCH_CLEAN_MCQ = 20
