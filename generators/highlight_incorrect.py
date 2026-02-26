"""Highlight Incorrect Words generator — PTE Listening."""

from .base import BaseGenerator


class HighlightIncorrectGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "highlight_incorrect"

    @property
    def remotion_composition_id(self) -> str:
        return "HighlightIncorrect"

    @property
    def exam_type(self) -> str:
        return "PTE"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate a PTE Listening "Highlight Incorrect Words" exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Highlight Incorrect Words",
  "scenario_description": "Identify words in the transcript that differ from what you hear",
  "audio_script": "A natural paragraph of 30-50 words spoken clearly. This is the CORRECT version that the test-taker hears.",
  "transcript": "The DISPLAYED version with 3 incorrect words substituted in. Must be the same length and structure as audio_script but with 3 words changed.",
  "incorrect_words": [
    {{"original": "wrong_word_in_transcript", "correction": "correct_word_from_audio", "word_index": 5}},
    {{"original": "wrong_word_in_transcript", "correction": "correct_word_from_audio", "word_index": 12}},
    {{"original": "wrong_word_in_transcript", "correction": "correct_word_from_audio", "word_index": 20}}
  ],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script is what gets spoken (the CORRECT version).
- The transcript is what's shown on screen (with 3 WRONG words).
- incorrect_words lists each wrong word with its correction and 0-based word index in the transcript.
- The wrong words should be semantically plausible but factually different.
- word_index counts words split by spaces, starting from 0.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "transcript", "incorrect_words", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        if len(data["incorrect_words"]) < 2 or len(data["incorrect_words"]) > 5:
            raise ValueError("Need 2-5 incorrect words")
        words = data["transcript"].split()
        for iw in data["incorrect_words"]:
            if "original" not in iw or "correction" not in iw or "word_index" not in iw:
                raise ValueError("Each incorrect_word must have original, correction, word_index")
            if iw["word_index"] >= len(words):
                raise ValueError(f"word_index {iw['word_index']} out of range for transcript")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "transcript": content["transcript"],
            "incorrectWords": content["incorrect_words"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Highlight Incorrect Words",
            "scenario_description": "Identify words in the transcript that differ from what you hear",
            "audio_script": "The professor announced that the final exam would be held on Wednesday instead of Friday due to a scheduling problem with the university auditorium.",
            "transcript": "The professor announced that the final exam would be held on Thursday instead of Friday due to a scheduling conflict with the university hall.",
            "incorrect_words": [
                {"original": "Thursday", "correction": "Wednesday", "word_index": 9},
                {"original": "conflict", "correction": "problem", "word_index": 18},
                {"original": "hall.", "correction": "auditorium", "word_index": 21},
            ],
            "voice_accent": "en-GB"
        }
