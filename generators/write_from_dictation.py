"""Write from Dictation generator — PTE Listening."""

from .base import BaseGenerator


class WriteFromDictationGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "write_from_dictation"

    @property
    def remotion_composition_id(self) -> str:
        return "WriteFromDictation"

    @property
    def exam_type(self) -> str:
        return "PTE"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate a PTE Listening "Write from Dictation" exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Write from Dictation",
  "scenario_description": "Write the sentence you hear exactly as spoken",
  "audio_script": "A clear, natural sentence of 8-15 words spoken at moderate pace. This is what the test-taker hears. Speak clearly and naturally.",
  "sentence": "The exact sentence that the test-taker must write down.",
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script should be a single clear sentence (not a dialogue).
- The sentence should be 8-15 words, grammatically correct, academic in tone.
- The audio_script and sentence should be identical text.
- Topic should relate to the scenario/category.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "sentence", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        words = data["sentence"].split()
        if len(words) < 5 or len(words) > 25:
            raise ValueError(f"Sentence should be 5-25 words, got {len(words)}")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "sentence": content["sentence"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Write from Dictation",
            "scenario_description": "Write the sentence you hear exactly as spoken",
            "audio_script": "The university library will be closed for renovations during the summer break.",
            "sentence": "The university library will be closed for renovations during the summer break.",
            "voice_accent": "en-GB"
        }
