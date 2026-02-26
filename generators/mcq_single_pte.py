"""MCQ Single Answer generator — PTE Listening (Dialogue version).

Reuses MCQSingle Remotion composition but with PTE exam branding and
dialogue-format audio with two distinct speakers.
"""

from .base import BaseGenerator


class MCQSinglePTEGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "mcq_single_pte"

    @property
    def remotion_composition_id(self) -> str:
        return "MCQSingle"  # Reuses existing visual component

    @property
    def exam_type(self) -> str:
        return "PTE"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate a PTE Academic Listening Multiple Choice (single answer) exercise.
Scenario: {scenario}, Category: {category}

The audio MUST be a natural, realistic DIALOGUE between two people in an academic setting:
- Speaker A: A student / researcher / colleague asking questions or discussing a topic.
- Speaker B: A professor / expert / advisor explaining or providing information.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Multiple Choice",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between Speaker A and Speaker B in an academic context. Include 'Speaker A:' and 'Speaker B:' labels before each turn. Make it feel like a real academic conversation.",
  "question": "A clear question about key information from the dialogue",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_index": 2,
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script MUST be a two-person dialogue with Speaker A and Speaker B labels.
- Use an academic, formal tone appropriate for PTE Academic.
- The dialogue should discuss the topic naturally, with one speaker seeking information and the other explaining.
- Provide exactly 4 options. Only ONE is correct.
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D).
- The question should test comprehension of a specific detail or main idea from the dialogue.
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
            "durationSeconds": round(duration + 4, 2),
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Multiple Choice",
            "scenario_description": "A student consults a professor about research methodology",
            "audio_script": (
                "Speaker A: Professor, I'm having trouble deciding on the right "
                "methodology for my dissertation. Could you advise me? "
                "Speaker B: Of course. What's your research question about? "
                "Speaker A: I'm looking at how social media affects student productivity. "
                "Speaker B: Interesting. For that topic, I'd strongly recommend a mixed-methods approach. "
                "Speaker A: Mixed methods? Why not just a survey? "
                "Speaker B: Well, surveys give you quantitative data, but you'd miss the nuance. "
                "Combining surveys with focus group interviews would give you both breadth and depth. "
                "Speaker A: That makes sense. How many participants would I need? "
                "Speaker B: For the survey, aim for at least two hundred. "
                "For focus groups, three groups of six to eight students would be sufficient. "
                "Speaker A: Thank you, that's really helpful."
            ),
            "question": "What methodology does the professor recommend?",
            "options": [
                "A purely quantitative survey approach",
                "Qualitative interviews only",
                "A mixed-methods approach combining surveys and interviews",
                "An experimental study with control groups",
            ],
            "correct_index": 2,
            "voice_accent": "en-GB",
        }
