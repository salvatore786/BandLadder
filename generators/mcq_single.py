"""MCQ Single Answer generator — IELTS/PTE Listening."""

from .base import BaseGenerator


class MCQSingleGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "mcq_single"

    @property
    def remotion_composition_id(self) -> str:
        return "MCQSingle"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Multiple Choice (single answer) exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Multiple Choice",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between two speakers about the scenario. Include Speaker A and Speaker B labels.",
  "question": "A clear question about key information in the dialogue",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_index": 2,
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script must be a realistic, natural dialogue of about 45 seconds.
- Provide exactly 4 options. Only ONE is correct.
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D).
- The question should test comprehension of a specific detail from the dialogue.
- Make wrong options plausible but clearly incorrect based on the dialogue.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "question", "options", "correct_index", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        if len(data["options"]) not in (3, 4):
            raise ValueError("Need 3 or 4 options")
        if not (0 <= data["correct_index"] < len(data["options"])):
            raise ValueError(f"correct_index {data['correct_index']} out of range")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "question": content["question"],
            "options": content["options"],
            "correctIndex": content["correct_index"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Multiple Choice",
            "scenario_description": "A student discusses course changes with an academic advisor",
            "audio_script": (
                "Speaker A: Hello, I'd like to discuss changing my course, please. "
                "Speaker B: Of course. Can you tell me why you're considering the change? "
                "Speaker A: Well, I really enjoy the subject, but the timetable clashes with my part-time job. "
                "Speaker B: I see. Have you considered switching to the evening section? "
                "Speaker A: I didn't know there was one. When does it run? "
                "Speaker B: Tuesday and Thursday evenings, from six to eight thirty. "
                "Speaker A: That would be perfect! Would I need to re-apply? "
                "Speaker B: No, I can arrange the transfer for you right now. "
                "Speaker A: That's wonderful, thank you so much."
            ),
            "question": "What is the main reason the student wants to change courses?",
            "options": [
                "The workload is too heavy",
                "The course content is not relevant",
                "The timetable clashes with work",
                "The lecturer is difficult to understand",
            ],
            "correct_index": 2,
            "voice_accent": "en-GB"
        }
