"""One-time script to add 40 new content plan entries for the 4 new question types."""

import json
from pathlib import Path

CONTENT_PLAN = Path(__file__).resolve().parent / "content" / "content_plan.json"

NEW_ENTRIES = [
    # ── Form Completion (IELTS) — IDs 81-90 ──────────────────────
    {"id": 81, "question_type": "form_completion", "category": "University", "scenario": "Student enrolling in an evening language class", "difficulty": "medium", "used": False},
    {"id": 82, "question_type": "form_completion", "category": "Travel", "scenario": "Tourist booking a guided bus tour of the city", "difficulty": "medium", "used": False},
    {"id": 83, "question_type": "form_completion", "category": "Healthcare", "scenario": "Patient registering at a new medical clinic", "difficulty": "medium", "used": False},
    {"id": 84, "question_type": "form_completion", "category": "Housing", "scenario": "Tenant filling in a rental application for an apartment", "difficulty": "medium", "used": False},
    {"id": 85, "question_type": "form_completion", "category": "Employment", "scenario": "Job applicant completing an interview registration form", "difficulty": "medium", "used": False},
    {"id": 86, "question_type": "form_completion", "category": "Banking", "scenario": "Customer opening a joint savings account", "difficulty": "medium", "used": False},
    {"id": 87, "question_type": "form_completion", "category": "Transport", "scenario": "Driver applying for a parking permit at the council office", "difficulty": "medium", "used": False},
    {"id": 88, "question_type": "form_completion", "category": "Insurance", "scenario": "Person filing a travel insurance claim over the phone", "difficulty": "medium", "used": False},
    {"id": 89, "question_type": "form_completion", "category": "Leisure", "scenario": "Member signing up for a gym and fitness centre", "difficulty": "medium", "used": False},
    {"id": 90, "question_type": "form_completion", "category": "Community", "scenario": "Volunteer registering for a charity fundraising event", "difficulty": "medium", "used": False},

    # ── Matching / Classification (IELTS) — IDs 91-100 ───────────
    {"id": 91, "question_type": "matching_classification", "category": "University", "scenario": "Comparing features of different student accommodation options", "difficulty": "medium", "used": False},
    {"id": 92, "question_type": "matching_classification", "category": "Travel", "scenario": "Matching tourist attractions to different city districts", "difficulty": "medium", "used": False},
    {"id": 93, "question_type": "matching_classification", "category": "Healthcare", "scenario": "Classifying symptoms and treatments into medical categories", "difficulty": "medium", "used": False},
    {"id": 94, "question_type": "matching_classification", "category": "Employment", "scenario": "Sorting job benefits into different employment contract types", "difficulty": "medium", "used": False},
    {"id": 95, "question_type": "matching_classification", "category": "Housing", "scenario": "Comparing features of houses, flats, and shared accommodation", "difficulty": "medium", "used": False},
    {"id": 96, "question_type": "matching_classification", "category": "Banking", "scenario": "Matching financial products to customer needs and risk levels", "difficulty": "medium", "used": False},
    {"id": 97, "question_type": "matching_classification", "category": "Transport", "scenario": "Classifying transport options by speed, cost, and convenience", "difficulty": "medium", "used": False},
    {"id": 98, "question_type": "matching_classification", "category": "Education", "scenario": "Sorting course modules into compulsory and elective categories", "difficulty": "medium", "used": False},
    {"id": 99, "question_type": "matching_classification", "category": "Leisure", "scenario": "Matching recreational activities to suitable age groups", "difficulty": "medium", "used": False},
    {"id": 100, "question_type": "matching_classification", "category": "Conference", "scenario": "Classifying conference sessions by topic and difficulty level", "difficulty": "medium", "used": False},

    # ── MCQ Multiple Answers (PTE) — IDs 101-110 ─────────────────
    {"id": 101, "question_type": "mcq_multiple", "category": "University", "scenario": "Lecture on the effects of urbanisation on wildlife habitats", "difficulty": "medium", "used": False},
    {"id": 102, "question_type": "mcq_multiple", "category": "Healthcare", "scenario": "Discussion about preventive healthcare measures in schools", "difficulty": "medium", "used": False},
    {"id": 103, "question_type": "mcq_multiple", "category": "Employment", "scenario": "Seminar on effective strategies for remote team management", "difficulty": "medium", "used": False},
    {"id": 104, "question_type": "mcq_multiple", "category": "Environment", "scenario": "Presentation about ocean pollution and conservation efforts", "difficulty": "medium", "used": False},
    {"id": 105, "question_type": "mcq_multiple", "category": "Technology", "scenario": "Discussion on artificial intelligence in modern education", "difficulty": "medium", "used": False},
    {"id": 106, "question_type": "mcq_multiple", "category": "Economics", "scenario": "Analysis of factors driving inflation in developing countries", "difficulty": "medium", "used": False},
    {"id": 107, "question_type": "mcq_multiple", "category": "Science", "scenario": "Lecture on the benefits and risks of genetic engineering", "difficulty": "medium", "used": False},
    {"id": 108, "question_type": "mcq_multiple", "category": "History", "scenario": "Discussion about the impact of the Industrial Revolution", "difficulty": "medium", "used": False},
    {"id": 109, "question_type": "mcq_multiple", "category": "Psychology", "scenario": "Seminar on cognitive biases affecting decision making", "difficulty": "medium", "used": False},
    {"id": 110, "question_type": "mcq_multiple", "category": "Sociology", "scenario": "Lecture on social media influence on public opinion", "difficulty": "medium", "used": False},

    # ── MCQ Single Answer PTE — IDs 111-120 ───────────────────────
    {"id": 111, "question_type": "mcq_single_pte", "category": "University", "scenario": "Academic advisor explaining dissertation submission requirements", "difficulty": "medium", "used": False},
    {"id": 112, "question_type": "mcq_single_pte", "category": "Healthcare", "scenario": "Doctor discussing treatment options with a patient", "difficulty": "medium", "used": False},
    {"id": 113, "question_type": "mcq_single_pte", "category": "Environment", "scenario": "Researcher presenting findings on deforestation rates", "difficulty": "medium", "used": False},
    {"id": 114, "question_type": "mcq_single_pte", "category": "Technology", "scenario": "Professor explaining blockchain technology applications", "difficulty": "medium", "used": False},
    {"id": 115, "question_type": "mcq_single_pte", "category": "Economics", "scenario": "Discussion about central bank monetary policy decisions", "difficulty": "medium", "used": False},
    {"id": 116, "question_type": "mcq_single_pte", "category": "Science", "scenario": "Lecture about climate change mitigation strategies", "difficulty": "medium", "used": False},
    {"id": 117, "question_type": "mcq_single_pte", "category": "History", "scenario": "Academic discussion on ancient civilisation trade routes", "difficulty": "medium", "used": False},
    {"id": 118, "question_type": "mcq_single_pte", "category": "Psychology", "scenario": "Professor explaining theories of language acquisition", "difficulty": "medium", "used": False},
    {"id": 119, "question_type": "mcq_single_pte", "category": "Sociology", "scenario": "Seminar about cultural diversity in urban communities", "difficulty": "medium", "used": False},
    {"id": 120, "question_type": "mcq_single_pte", "category": "Education", "scenario": "Discussion on the effectiveness of online learning platforms", "difficulty": "medium", "used": False},
]

def main():
    with open(CONTENT_PLAN, "r", encoding="utf-8") as f:
        plan = json.load(f)

    existing_ids = {e["id"] for e in plan}
    added = 0
    for entry in NEW_ENTRIES:
        if entry["id"] not in existing_ids:
            plan.append(entry)
            added += 1

    with open(CONTENT_PLAN, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=2, ensure_ascii=False)

    print(f"Added {added} new entries. Total entries: {len(plan)}")

if __name__ == "__main__":
    main()
