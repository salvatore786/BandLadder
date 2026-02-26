"""Sentence Completion generator — IELTS Listening Section 1."""

from .base import BaseGenerator


class SentenceCompletionGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "sentence_completion"

    @property
    def remotion_composition_id(self) -> str:
        return "SentenceCompletion"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Section 1 Sentence Completion exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Sentence Completion",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between two speakers about the scenario. Include Speaker A and Speaker B labels. This is what gets converted to audio.",
  "display_sentences": [
    "Example sentence with ___ blank.",
    "Another sentence with ___ blank.",
    "Third sentence with ___ blank.",
    "Fourth sentence with ___ blank.",
    "Fifth sentence with ___ blank."
  ],
  "answers": ["answer1", "answer2", "answer3", "answer4", "answer5"],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script must be a realistic, natural dialogue of about 45 seconds when spoken aloud.
- The display_sentences must have exactly 5 sentences, each with one blank marked as ___.
- The answers array must have exactly 5 answers matching the blanks in order.
- The blanks in the sentences should be completable from information in the dialogue.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "display_sentences", "answers", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        if len(data["display_sentences"]) != 5 or len(data["answers"]) != 5:
            raise ValueError("Need exactly 5 sentences and 5 answers")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "sentences": content["display_sentences"],
            "answers": content["answers"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Sentence Completion",
            "scenario_description": "A student asks about joining the university library",
            "audio_script": (
                "Speaker A: Good morning, I'd like to find out about getting a library card, please. "
                "Speaker B: Of course. Library membership costs twenty-five pounds per year for students. "
                "Speaker A: That sounds reasonable. What do I need to bring? "
                "Speaker B: You'll need to bring your student ID when you come to register. "
                "Speaker A: Right. And what are the opening hours? "
                "Speaker B: We open at half past eight on weekdays, and ten o'clock on Saturdays. "
                "Speaker A: Great. How long can I keep books for? "
                "Speaker B: Books can be borrowed for up to three weeks at a time. "
                "Speaker A: And if I return them late? "
                "Speaker B: There's a late return fee of fifty pence per day per item."
            ),
            "display_sentences": [
                "The library membership costs ___ per year.",
                "Students need to bring their ___ to register.",
                "The library opens at ___ on weekdays.",
                "Books can be borrowed for ___ weeks.",
                "The late return fee is ___ per day."
            ],
            "answers": ["\u00a325", "student ID", "8:30 AM", "3", "50p"],
            "voice_accent": "en-GB"
        }
