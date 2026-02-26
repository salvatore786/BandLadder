#!/usr/bin/env python3
"""
Auto-refill content plans when running low on unused entries.

Uses Groq LLM (llama-3.3-70b-versatile) to generate new scenario entries
from curated seed category lists. 3-layer deduplication prevents repeats.

Usage:
  python refill_content_plan.py              # Check all plans, refill if needed
  python refill_content_plan.py --dry-run    # Show what would be generated
  python refill_content_plan.py --force      # Refill regardless of threshold

Or import:
  from refill_content_plan import refill_all_plans
  summary = refill_all_plans()
"""

import argparse
import json
import logging
import os
import random
import re
import sys
import time
from pathlib import Path

from config import (
    CONTENT_PLAN, CUE_CARD_CONTENT_PLAN, CLEAN_MCQ_CONTENT_PLAN,
    REFILL_THRESHOLD_LISTENING, REFILL_THRESHOLD_CUE_CARD, REFILL_THRESHOLD_CLEAN_MCQ,
    REFILL_BATCH_LISTENING, REFILL_BATCH_CUE_CARD, REFILL_BATCH_CLEAN_MCQ,
)

log = logging.getLogger("refill_content_plan")

# ── Seed Category Lists ──────────────────────────────────────────────────────

LISTENING_CATEGORIES = [
    "University", "Travel", "Healthcare", "Housing", "Employment",
    "Banking", "Transport", "Shopping", "Tourism", "Restaurant",
    "Sports Club", "Insurance", "Museum", "Conference", "Library",
    "Community", "Education", "Fitness", "Leisure", "Agriculture",
    "Architecture", "Aviation", "Childcare", "Dentistry",
    "Emergency Services", "Energy", "Fashion", "Gardening",
    "Government", "Hospitality", "Immigration", "Journalism",
    "Law", "Manufacturing", "Marine", "Military", "Mining",
    "Music", "Nutrition", "Pets & Veterinary", "Photography",
    "Real Estate", "Recycling", "Retail", "Safety", "Social Work",
    "Telecommunications", "Theatre", "Volunteering", "Weather",
    "Wildlife", "Economics", "Science", "History", "Psychology",
    "Sociology", "Environment", "Technology",
]

CUE_CARD_CATEGORIES = [
    "Books & Reading", "Travel & Holidays", "People & Relationships",
    "Technology", "Education & Learning", "Food & Cooking",
    "Achievements & Success", "Places & Cities", "Hobbies & Leisure",
    "Environment & Nature", "Health & Fitness", "Entertainment & Media",
    "Work & Career", "Childhood & Memories", "Culture & Traditions",
    "Animals & Pets", "Art & Creativity", "Communication & Language",
    "Fashion & Style", "Festivals & Events", "History & Heritage",
    "Law & Justice", "Money & Finance", "Music & Dance",
    "Science & Innovation", "Shopping & Consumerism",
    "Social Media & Internet", "Sports & Competition",
    "Transport & Travel", "Weather & Seasons",
]

CLEAN_MCQ_CATEGORIES = [
    "University", "Travel", "Health", "Employment", "Shopping",
    "Accommodation", "Sports", "Food & Dining", "Banking",
    "Entertainment", "Transport", "Environment", "Technology",
    "Community", "Library", "Insurance", "Tourism", "Fitness",
    "Education", "Government",
]

LISTENING_QUESTION_TYPES = [
    "sentence_completion", "mcq_single", "note_completion",
    "table_completion", "write_from_dictation", "highlight_incorrect",
    "form_completion", "matching_classification", "mcq_multiple",
    "mcq_single_pte",
]


# ── LLM Client (Cerebras primary → Groq fallback) ───────────────────────────
from llm_client import chat_completion


# ── Plan I/O Helpers ─────────────────────────────────────────────────────────

def count_unused(plan_path: Path) -> int:
    """Count unused entries in a content plan."""
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)
    return sum(1 for e in plan if not e["used"])


def load_existing_scenarios(plan_path: Path) -> set[str]:
    """Extract all scenario strings (lowercased) from a plan for dedup."""
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)
    return {e["scenario"].lower().strip() for e in plan}


def get_max_id(plan_path: Path) -> int:
    """Get highest entry ID in a plan."""
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)
    return max((e["id"] for e in plan), default=0)


def append_entries_to_plan(plan_path: Path, new_entries: list[dict]) -> int:
    """Append new entries to the plan JSON file. Returns count added."""
    with open(plan_path, "r", encoding="utf-8") as f:
        plan = json.load(f)

    max_id = max((e["id"] for e in plan), default=0)

    for i, entry in enumerate(new_entries):
        entry["id"] = max_id + 1 + i
        entry["difficulty"] = "medium"
        entry["used"] = False
        plan.append(entry)

    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)

    return len(new_entries)


# ── Deduplication ────────────────────────────────────────────────────────────

def is_too_similar(new_scenario: str, existing: set[str], threshold: float = 0.7) -> bool:
    """Check if a new scenario is too similar to any existing one (Jaccard word overlap)."""
    new_words = set(new_scenario.lower().strip().split())
    if len(new_words) < 3:
        return False  # Too short to meaningfully compare

    for ex in existing:
        ex_words = set(ex.split())
        if len(ex_words) < 3:
            continue
        intersection = new_words & ex_words
        union = new_words | ex_words
        if union and len(intersection) / len(union) > threshold:
            return True
    return False


def validate_and_dedup(
    new_entries: list[dict],
    existing_scenarios: set[str],
    required_question_type: str | None = None,
    valid_question_types: list[str] | None = None,
) -> list[dict]:
    """Validate schema, enforce question_type, deduplicate. Returns valid entries."""
    valid = []
    seen_in_batch: set[str] = set()
    rejected = {"schema": 0, "exact_dup": 0, "similar": 0, "batch_dup": 0}

    for entry in new_entries:
        # Schema validation
        if not isinstance(entry, dict):
            rejected["schema"] += 1
            continue
        if "scenario" not in entry or "category" not in entry:
            rejected["schema"] += 1
            continue

        scenario = entry["scenario"].strip()
        if len(scenario) < 8 or len(scenario) > 150:
            rejected["schema"] += 1
            continue

        # Force correct question_type for single-type plans
        if required_question_type:
            entry["question_type"] = required_question_type
        elif "question_type" not in entry:
            rejected["schema"] += 1
            continue
        elif valid_question_types and entry["question_type"] not in valid_question_types:
            rejected["schema"] += 1
            continue

        scenario_lower = scenario.lower().strip()

        # Exact match dedup
        if scenario_lower in existing_scenarios:
            rejected["exact_dup"] += 1
            continue

        # Intra-batch dedup
        if scenario_lower in seen_in_batch:
            rejected["batch_dup"] += 1
            continue

        # Fuzzy dedup
        if is_too_similar(scenario, existing_scenarios):
            rejected["similar"] += 1
            continue

        valid.append(entry)
        seen_in_batch.add(scenario_lower)
        existing_scenarios.add(scenario_lower)  # Block future batch dups too

    if any(rejected.values()):
        log.info(f"    Dedup: kept {len(valid)}, rejected {sum(rejected.values())} "
                 f"(schema={rejected['schema']}, exact={rejected['exact_dup']}, "
                 f"similar={rejected['similar']}, batch={rejected['batch_dup']})")

    return valid


# ── LLM Calls ────────────────────────────────────────────────────────────────

def call_llm_for_entries(prompt: str, max_retries: int = 3) -> list[dict]:
    """Call LLM (Cerebras → Groq fallback) with retry, parse JSON array response."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are an IELTS/PTE content plan generator. "
                "Return ONLY valid JSON arrays, no markdown fences or extra text."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    for attempt in range(1, max_retries + 1):
        try:
            raw = chat_completion(messages, temperature=0.85, max_tokens=4096)
            # Strip markdown fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            entries = json.loads(raw)
            if not isinstance(entries, list):
                raise ValueError("Response is not a JSON array")
            return entries

        except (json.JSONDecodeError, ValueError) as e:
            log.warning(f"    LLM attempt {attempt}/{max_retries} parse error: {e}")
            if attempt == max_retries:
                raise

        except RuntimeError as e:
            log.error(f"    All providers failed: {e}")
            raise

    return []


# ── Prompt Builders ──────────────────────────────────────────────────────────

def build_listening_prompt(
    question_types: list[str],
    categories: list[str],
    existing_scenarios: list[str],
) -> str:
    """Build prompt for generating listening content plan entries."""
    return f"""Generate {len(question_types)} new IELTS/PTE listening content plan entries.

Generate EXACTLY ONE entry for EACH of these question types:
{json.dumps(question_types)}

Use categories from this list (distribute evenly, vary the categories):
{json.dumps(categories)}

EXISTING scenarios to AVOID (do NOT create anything similar):
{json.dumps(existing_scenarios[-20:])}

Each entry must be a JSON object with:
- "question_type": one of the types listed above
- "category": from the category list above
- "scenario": a unique, specific 8-15 word scenario description

SCENARIO STYLE GUIDE by question type:
- sentence_completion, note_completion, form_completion: Conversational — "Person/role doing action at/about topic" (e.g., "Student enquiring about library membership fees")
- mcq_single, mcq_single_pte: Conversational choice — "Person discussing or choosing between options about topic"
- table_completion: Comparison — "Person comparing features, prices, or schedules of topic"
- write_from_dictation: Academic statement — "An informational statement or announcement about topic"
- highlight_incorrect: Lecture excerpt — "A lecture or presentation about an academic topic"
- matching_classification: Sorting — "Comparing or classifying items into categories about topic"
- mcq_multiple: Academic discussion — "A seminar or lecture discussing multiple aspects of topic"

RULES:
1. Each scenario MUST be unique and specific — not generic.
2. Scenarios must be realistic IELTS/PTE exam contexts.
3. Use a DIFFERENT category for each entry.
4. Do NOT duplicate any existing scenario listed above.
5. Keep scenarios between 8-15 words.

Return ONLY a JSON array of objects. No markdown, no extra text.
Example: [{{"question_type": "sentence_completion", "category": "University", "scenario": "Student asking about postgraduate scholarship deadlines and requirements"}}]"""


def build_cue_card_prompt(
    categories: list[str],
    existing_scenarios: list[str],
    count: int,
) -> str:
    """Build prompt for generating cue card content plan entries."""
    return f"""Generate {count} new IELTS Speaking Part 2 (Cue Card) content plan entries.

All entries must have question_type "cue_card".

Use ONE category per entry from this list (distribute evenly, vary categories):
{json.dumps(categories)}

EXISTING topics to AVOID (do NOT create similar topics):
{json.dumps(existing_scenarios[-15:])}

Each entry must be:
- "question_type": "cue_card"
- "category": from the list above
- "scenario": an IELTS Part 2 topic starting with "Describe a..." or "Describe an..." (8-15 words)

Topic variety — include a mix of:
- People (a person who influenced you, a friend, a teacher)
- Places (a city, a park, a building)
- Objects (a gift, a book, a device)
- Experiences (a time when..., an event, a journey)
- Abstract concepts (a skill, a goal, a change)

Topics should reflect real IELTS exam questions from recent tests.

Return ONLY a JSON array. No markdown, no extra text.
Example: [{{"question_type": "cue_card", "category": "Travel & Holidays", "scenario": "Describe a journey that did not go as planned"}}]"""


def build_clean_mcq_prompt(
    categories: list[str],
    existing_scenarios: list[str],
    count: int,
) -> str:
    """Build prompt for generating clean MCQ content plan entries."""
    return f"""Generate {count} new IELTS Listening MCQ (single answer) content plan entries.

All entries must have question_type "mcq_single_clean".

Use ONE category per entry from this list (distribute evenly):
{json.dumps(categories)}

EXISTING scenarios to AVOID (do NOT create similar ones):
{json.dumps(existing_scenarios[-15:])}

Each entry must be:
- "question_type": "mcq_single_clean"
- "category": from the list above
- "scenario": a short conversational scenario (8-15 words) describing a realistic dialogue situation

These scenarios are for SHORT (15-20 second) everyday dialogues between two people.

Examples of good scenarios:
- "A customer asking about refund policy at a clothing store"
- "Two colleagues discussing lunch options near the office"
- "A tenant reporting a maintenance issue to the landlord"
- "A parent enquiring about school admission procedures"

RULES:
1. Each scenario MUST describe a specific, realistic conversation.
2. Use a DIFFERENT category for each entry.
3. Do NOT duplicate existing scenarios.
4. Keep scenarios between 8-15 words.

Return ONLY a JSON array. No markdown, no extra text."""


# ── Entry Generators ─────────────────────────────────────────────────────────

def generate_listening_entries(count: int, existing_scenarios: set[str]) -> list[dict]:
    """Generate listening entries distributed across all 10 question types."""
    all_entries = []
    entries_per_round = len(LISTENING_QUESTION_TYPES)  # 10 per LLM call
    rounds = max(1, count // entries_per_round)
    remainder = count - rounds * entries_per_round

    existing_list = list(existing_scenarios)

    for batch_num in range(rounds):
        cats = random.sample(LISTENING_CATEGORIES, min(15, len(LISTENING_CATEGORIES)))
        prompt = build_listening_prompt(LISTENING_QUESTION_TYPES, cats, existing_list)
        try:
            log.info(f"    Listening batch {batch_num + 1}/{rounds} ({entries_per_round} entries)...")
            batch = call_llm_for_entries(prompt)
            all_entries.extend(batch)
            # Add new scenarios to existing list to avoid cross-batch dups
            for e in batch:
                if "scenario" in e:
                    existing_list.append(e["scenario"])
        except Exception as e:
            log.warning(f"    Listening batch {batch_num + 1} failed: {e}")

    # Handle remainder
    if remainder > 0:
        types_subset = random.sample(LISTENING_QUESTION_TYPES, remainder)
        cats = random.sample(LISTENING_CATEGORIES, min(10, len(LISTENING_CATEGORIES)))
        prompt = build_listening_prompt(types_subset, cats, existing_list)
        try:
            log.info(f"    Listening remainder batch ({remainder} entries)...")
            batch = call_llm_for_entries(prompt)
            all_entries.extend(batch)
        except Exception as e:
            log.warning(f"    Listening remainder batch failed: {e}")

    return all_entries


def generate_cue_card_entries(count: int, existing_scenarios: set[str]) -> list[dict]:
    """Generate cue card entries in batches of 10."""
    all_entries = []
    existing_list = list(existing_scenarios)

    for batch_start in range(0, count, 10):
        batch_size = min(10, count - batch_start)
        cats = random.sample(CUE_CARD_CATEGORIES, min(batch_size, len(CUE_CARD_CATEGORIES)))
        batch_num = batch_start // 10 + 1
        total_batches = (count + 9) // 10

        try:
            log.info(f"    Cue card batch {batch_num}/{total_batches} ({batch_size} entries)...")
            prompt = build_cue_card_prompt(cats, existing_list, batch_size)
            batch = call_llm_for_entries(prompt)
            all_entries.extend(batch)
            for e in batch:
                if "scenario" in e:
                    existing_list.append(e["scenario"])
        except Exception as e:
            log.warning(f"    Cue card batch {batch_num} failed: {e}")

    return all_entries


def generate_clean_mcq_entries(count: int, existing_scenarios: set[str]) -> list[dict]:
    """Generate clean MCQ entries in batches of 10."""
    all_entries = []
    existing_list = list(existing_scenarios)

    for batch_start in range(0, count, 10):
        batch_size = min(10, count - batch_start)
        cats = random.sample(CLEAN_MCQ_CATEGORIES, min(batch_size, len(CLEAN_MCQ_CATEGORIES)))
        batch_num = batch_start // 10 + 1
        total_batches = (count + 9) // 10

        try:
            log.info(f"    Clean MCQ batch {batch_num}/{total_batches} ({batch_size} entries)...")
            prompt = build_clean_mcq_prompt(cats, existing_list, batch_size)
            batch = call_llm_for_entries(prompt)
            all_entries.extend(batch)
            for e in batch:
                if "scenario" in e:
                    existing_list.append(e["scenario"])
        except Exception as e:
            log.warning(f"    Clean MCQ batch {batch_num} failed: {e}")

    return all_entries


# ── Core Refill Logic ────────────────────────────────────────────────────────

def refill_plan(
    plan_path: Path,
    threshold: int,
    batch_size: int,
    generator_fn,
    required_qtype: str | None = None,
    valid_question_types: list[str] | None = None,
    dry_run: bool = False,
    force: bool = False,
) -> dict:
    """Check one plan, refill if needed. Returns summary dict."""
    plan_name = plan_path.stem
    unused = count_unused(plan_path)

    if unused >= threshold and not force:
        return {"refilled": False, "unused": unused, "threshold": threshold}

    log.info(f"  {plan_name}: {unused} unused {'(forced)' if force else f'< threshold {threshold}'}. "
             f"Generating {batch_size} entries...")

    if dry_run:
        log.info(f"  [DRY RUN] Would generate {batch_size} entries for {plan_name}")
        return {"refilled": False, "unused": unused, "threshold": threshold, "would_generate": batch_size}

    existing = load_existing_scenarios(plan_path)
    raw_entries = generator_fn(batch_size, existing)

    if not raw_entries:
        log.warning(f"  {plan_name}: LLM returned 0 entries. Skipping.")
        return {"refilled": False, "unused": unused, "threshold": threshold, "error": "LLM returned 0"}

    valid_entries = validate_and_dedup(
        raw_entries, existing,
        required_question_type=required_qtype,
        valid_question_types=valid_question_types,
    )

    if not valid_entries:
        log.warning(f"  {plan_name}: 0 valid entries after dedup. Skipping.")
        return {"refilled": False, "unused": unused, "threshold": threshold, "error": "0 after dedup"}

    added = append_entries_to_plan(plan_path, valid_entries)
    new_unused = count_unused(plan_path)

    log.info(f"  {plan_name}: Added {added} entries. Unused: {unused} -> {new_unused}")

    return {
        "refilled": True,
        "before_unused": unused,
        "after_unused": new_unused,
        "added": added,
        "requested": batch_size,
        "threshold": threshold,
    }


def refill_all_plans(dry_run: bool = False, force: bool = False) -> dict:
    """Check all 3 plans, refill as needed. Returns summary dict."""
    summary = {}

    summary["listening"] = refill_plan(
        CONTENT_PLAN,
        REFILL_THRESHOLD_LISTENING,
        REFILL_BATCH_LISTENING,
        generate_listening_entries,
        required_qtype=None,
        valid_question_types=LISTENING_QUESTION_TYPES,
        dry_run=dry_run,
        force=force,
    )

    summary["cue_card"] = refill_plan(
        CUE_CARD_CONTENT_PLAN,
        REFILL_THRESHOLD_CUE_CARD,
        REFILL_BATCH_CUE_CARD,
        generate_cue_card_entries,
        required_qtype="cue_card",
        dry_run=dry_run,
        force=force,
    )

    summary["clean_mcq"] = refill_plan(
        CLEAN_MCQ_CONTENT_PLAN,
        REFILL_THRESHOLD_CLEAN_MCQ,
        REFILL_BATCH_CLEAN_MCQ,
        generate_clean_mcq_entries,
        required_qtype="mcq_single_clean",
        dry_run=dry_run,
        force=force,
    )

    return summary


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Auto-refill content plans with LLM")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    parser.add_argument("--force", action="store_true", help="Refill regardless of threshold")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    log.info("=" * 50)
    log.info("  Content Plan Auto-Refill")
    log.info("=" * 50)

    # Show current status
    for name, path in [
        ("Listening", CONTENT_PLAN),
        ("Cue Card", CUE_CARD_CONTENT_PLAN),
        ("Clean MCQ", CLEAN_MCQ_CONTENT_PLAN),
    ]:
        unused = count_unused(path)
        with open(path, "r", encoding="utf-8") as f:
            total = len(json.load(f))
        log.info(f"  {name}: {unused} unused / {total} total")

    log.info("")

    try:
        summary = refill_all_plans(dry_run=args.dry_run, force=args.force)
    except Exception as e:
        log.error(f"Refill failed: {e}", exc_info=True)
        sys.exit(1)

    # Summary
    log.info("")
    log.info("=" * 50)
    log.info("  REFILL SUMMARY")
    for plan_name, info in summary.items():
        if info.get("refilled"):
            log.info(f"  {plan_name}: +{info['added']} entries "
                     f"({info['before_unused']} -> {info['after_unused']} unused)")
        elif info.get("would_generate"):
            log.info(f"  {plan_name}: [DRY RUN] would generate {info['would_generate']} entries")
        else:
            log.info(f"  {plan_name}: OK ({info.get('unused', '?')} unused, "
                     f"threshold={info.get('threshold', '?')})")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
