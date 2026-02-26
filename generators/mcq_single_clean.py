"""MCQ Single Answer generator — Clean listening quiz style.

Uses the MCQSingleClean Remotion composition with:
- Light blue background, mascot with sound waves
- Bangers + Poppins fonts
- Inline hook (3s) and CTA (5s) screens
- Longer dialogues (~30-40s) for engaging reel-length videos
"""

from .base import BaseGenerator

# ── Clean composition hook/CTA defaults ──────────────────────────────────────
CLEAN_HOOK_DURATION = 3    # seconds
CLEAN_CTA_DURATION = 5     # seconds
CLEAN_HOOK_TEXT = "Can you answer this?"
CLEAN_CTA_LINE1 = "For more practice,"
CLEAN_CTA_LINE2 = "follow BandLadder"


class MCQSingleCleanGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "mcq_single_clean"

    @property
    def remotion_composition_id(self) -> str:
        return "MCQSingleClean"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Multiple Choice (single answer) exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "headerText": "IELTS 6 listening",
  "audio_script": "A natural 25–35 second dialogue between two speakers. Include Speaker A and Speaker B labels. Use 4-6 dialogue turns with natural conversation.",
  "question": "A clear question about the dialogue (can be longer and specific)",
  "options": ["A. descriptive answer", "B. descriptive answer", "C. descriptive answer"],
  "correct_index": 1,
  "voice_accent": "en-GB"
}}

CHARACTER LIMITS — the content MUST fit a 1080×1920 vertical mobile screen:
- "headerText": MAX 25 characters (e.g. "IELTS 6 listening")
- "question": MAX 70 characters — be specific and detailed
- "options": EXACTLY 3 options, each MAX 35 characters including the "A. " / "B. " / "C. " prefix
- "audio_script": 25–35 second natural dialogue with 4-6 turns

AUDIO SCRIPT REQUIREMENTS (CRITICAL — follow these carefully):
- MUST be 70-100 words total (this produces 25-35 seconds of audio)
- Include 4-6 dialogue turns alternating between Speaker A and Speaker B
- Each turn should be 1-2 full sentences (not just a few words)
- Make the conversation natural with follow-up questions and detailed responses
- Include specific details (names, numbers, dates, places) that can be tested
- DO NOT write a short 2-turn exchange — the dialogue must have at least 4 turns

IMPORTANT:
- The audio_script must be a natural dialogue with Speaker A and Speaker B labels.
- Provide EXACTLY 3 options (not 4). Only ONE is correct.
- correct_index is 0-based (0=A, 1=B, 2=C).
- The question should test comprehension of a specific detail from the dialogue.
- Make wrong options plausible but clearly incorrect based on the dialogue.
- Every option MUST start with "A. ", "B. ", or "C. " prefix.
- COUNT your characters carefully. If a question exceeds 70 chars, shorten it.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["headerText", "audio_script", "question", "options",
                     "correct_index", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")

        # Character limit checks
        if len(data["headerText"]) > 30:
            raise ValueError(f"headerText too long: {len(data['headerText'])} chars (max 30)")
        if len(data["question"]) > 80:
            raise ValueError(f"question too long: {len(data['question'])} chars (max 80)")

        if len(data["options"]) != 3:
            raise ValueError(f"Need exactly 3 options, got {len(data['options'])}")

        for i, opt in enumerate(data["options"]):
            if len(opt) > 40:
                raise ValueError(f"Option {i} too long: {len(opt)} chars (max 40)")

        if not (0 <= data["correct_index"] < 3):
            raise ValueError(f"correct_index {data['correct_index']} out of range (0-2)")

        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "headerText": content["headerText"],
            "question": content["question"],
            "options": content["options"],
            "correctIndex": content["correct_index"],
            "durationSeconds": round(duration + 8, 2),    # audio + 8s reveal/buffer
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
        }

    def get_sample_content(self) -> dict:
        return {
            "headerText": "IELTS 6 listening",
            "audio_script": (
                "Speaker A: So how long were you in Australia altogether? "
                "Speaker B: Well, I spent the first six months studying in Melbourne, "
                "and then I stayed on for another six months doing an internship in Sydney. "
                "Speaker A: That sounds like a great experience. What was the internship in? "
                "Speaker B: It was in environmental science. I was helping with a water quality "
                "project along the coast. It really opened my eyes to the practical side of things."
            ),
            "question": "What was the focus of her internship in Sydney?",
            "options": [
                "A. Marine biology research",
                "B. Water quality monitoring",
                "C. Urban planning project",
            ],
            "correct_index": 1,
            "voice_accent": "en-GB",
        }
