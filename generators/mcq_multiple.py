"""MCQ Multiple Answers generator — PTE Listening (Dialogue version).

Requires the MCQMultiple Remotion composition.
Multiple options can be correct (checkbox-style instead of radio).
"""

from .base import BaseGenerator


class MCQMultipleGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "mcq_multiple"

    @property
    def remotion_composition_id(self) -> str:
        return "MCQMultiple"

    @property
    def exam_type(self) -> str:
        return "PTE"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate a PTE Academic Listening Multiple Choice (multiple answers) exercise.
Scenario: {scenario}, Category: {category}

The audio MUST be a natural, realistic DIALOGUE between two people in an academic setting:
- Speaker A: A student / researcher asking questions or discussing a topic.
- Speaker B: A professor / expert providing detailed information covering multiple points.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Multiple Choice — Multiple Answers",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between Speaker A and Speaker B in an academic context. Include 'Speaker A:' and 'Speaker B:' labels before each turn. The dialogue should clearly cover multiple correct points.",
  "question": "A question where MULTIPLE answers are correct based on the dialogue",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text", "Option E text"],
  "correct_indices": [1, 3],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script MUST be a two-person dialogue with Speaker A and Speaker B labels.
- Use a formal, academic tone appropriate for PTE Academic.
- Provide exactly 5 options. Exactly 2 or 3 should be correct.
- correct_indices is a list of 0-based indices of ALL correct answers.
- The question should ask about multiple details or aspects from the dialogue.
- Wrong options should be plausible but clearly unsupported by the dialogue.
- The dialogue must contain enough detail to support the multiple correct answers.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "question", "options", "correct_indices", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        opts = data["options"]
        indices = data["correct_indices"]
        if len(opts) < 4 or len(opts) > 5:
            raise ValueError(f"Need 4-5 options, got {len(opts)}")
        if not isinstance(indices, list) or len(indices) < 2 or len(indices) > 3:
            raise ValueError(f"Need 2-3 correct_indices, got {indices}")
        for idx in indices:
            if not (0 <= idx < len(opts)):
                raise ValueError(f"correct_indices {idx} out of range for {len(opts)} options")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "question": content["question"],
            "options": content["options"],
            "correctIndices": content["correct_indices"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Multiple Choice — Multiple Answers",
            "scenario_description": "A lecture discussion about renewable energy benefits",
            "audio_script": (
                "Speaker A: Professor, could you summarise the main benefits "
                "of switching to renewable energy? "
                "Speaker B: Certainly. First, renewables significantly reduce "
                "greenhouse gas emissions compared to fossil fuels. "
                "Speaker A: What about the economic side? "
                "Speaker B: Well, while the initial investment is higher, "
                "the long-term operating costs are much lower. "
                "Solar and wind farms require minimal maintenance once installed. "
                "Speaker A: Are there any benefits for local communities? "
                "Speaker B: Absolutely. Renewable energy projects create local jobs, "
                "particularly in rural areas where opportunities are limited. "
                "Speaker A: And energy independence? "
                "Speaker B: That's a crucial point. Countries can reduce their "
                "dependence on imported fuels, which improves energy security."
            ),
            "question": "According to the discussion, which are benefits of renewable energy?",
            "options": [
                "Lower initial investment costs than fossil fuels",
                "Reduced greenhouse gas emissions",
                "Completely eliminates the need for all fossil fuels",
                "Creates employment in local communities",
                "Requires more maintenance than traditional power plants",
            ],
            "correct_indices": [1, 3],
            "voice_accent": "en-GB",
        }
