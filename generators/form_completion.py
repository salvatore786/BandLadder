"""Form Completion generator — IELTS Listening Section 1 (Dialogue version).

Reuses NoteCompletion Remotion composition but generates dialogue-format audio
with two distinct speakers, providing variety from the monologue note_completion.
"""

from .base import BaseGenerator


class FormCompletionGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "form_completion"

    @property
    def remotion_composition_id(self) -> str:
        return "NoteCompletion"  # Reuses existing visual component

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Section 1 Form Completion exercise.
Scenario: {scenario}, Category: {category}

The audio MUST be a natural, realistic DIALOGUE between two people:
- Speaker A: A staff member / receptionist / official asking questions and confirming details.
- Speaker B: A customer / applicant / visitor providing their personal information.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Form Completion",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between Speaker A and Speaker B. Speaker A asks questions to fill in a form, Speaker B answers with specific details. Include 'Speaker A:' and 'Speaker B:' labels before each turn. Make it feel like a real conversation with natural pauses and confirmations.",
  "form_title": "Title of the form (e.g., 'Registration Form', 'Application Form', 'Booking Details')",
  "fields": [
    {{"label": "Field Label 1", "value": "answer1"}},
    {{"label": "Field Label 2", "value": "answer2"}},
    {{"label": "Field Label 3", "value": "answer3"}},
    {{"label": "Field Label 4", "value": "answer4"}},
    {{"label": "Field Label 5", "value": "answer5"}}
  ],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script MUST be a two-person dialogue with Speaker A and Speaker B labels.
- Speaker A should ask questions naturally: "Could I have your name, please?", "And what's the best number to contact you on?"
- Speaker B should respond with specific details that become the form answers.
- Include natural conversational elements: "Right, let me just note that down", "Sorry, could you spell that?", "Of course", etc.
- Provide exactly 5 form fields with labels and answers.
- Labels should be realistic form fields (Name, Date, Contact Number, Address, etc.).
- Answers should be specific details from Speaker B's responses.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "form_title", "fields", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        if len(data["fields"]) != 5:
            raise ValueError("Need exactly 5 fields")
        for f in data["fields"]:
            if "label" not in f or "value" not in f:
                raise ValueError("Each field must have 'label' and 'value'")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "formTitle": content["form_title"],
            "fields": content["fields"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Form Completion",
            "scenario_description": "A visitor registering at a language school reception",
            "audio_script": (
                "Speaker A: Good morning, welcome to the Greenfield Language Academy. "
                "I just need to take a few details to complete your registration. "
                "Could I start with your full name, please? "
                "Speaker B: Yes, it's Maria Santos. "
                "Speaker A: Lovely. And your nationality, Maria? "
                "Speaker B: I'm Brazilian. "
                "Speaker A: Great. Now, what course are you interested in? "
                "Speaker B: I'd like to enrol in the Advanced English course. "
                "Speaker A: Perfect. And when would you like to start? "
                "Speaker B: The fifth of April, if possible. "
                "Speaker A: Let me check... yes, that works. Finally, "
                "do you have a contact number we can reach you on? "
                "Speaker B: Sure, it's oh-seven-seven-double-four-nine-three-one-eight-six. "
                "Speaker A: Wonderful, you're all registered!"
            ),
            "form_title": "Language School Registration",
            "fields": [
                {"label": "Full Name", "value": "Maria Santos"},
                {"label": "Nationality", "value": "Brazilian"},
                {"label": "Course", "value": "Advanced English"},
                {"label": "Start Date", "value": "5th April"},
                {"label": "Contact Number", "value": "077 4493 1186"},
            ],
            "voice_accent": "en-GB",
        }
