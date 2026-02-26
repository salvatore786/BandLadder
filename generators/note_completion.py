"""Note/Form Completion generator — IELTS Listening Section 1."""

from .base import BaseGenerator


class NoteCompletionGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "note_completion"

    @property
    def remotion_composition_id(self) -> str:
        return "NoteCompletion"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Section 1 Note/Form Completion exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Note Completion",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between two speakers about the scenario. Include Speaker A and Speaker B labels.",
  "form_title": "Title of the form (e.g., 'Registration Form', 'Booking Details')",
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
- The audio_script must be a realistic, natural dialogue of about 45 seconds.
- Provide exactly 5 form fields with labels and answers.
- Labels should be realistic form fields (Name, Date, Cost, Type, etc.).
- Answers should be specific details from the dialogue (names, numbers, dates, etc.).
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
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Note Completion",
            "scenario_description": "A guest making a hotel reservation over the phone",
            "audio_script": (
                "Speaker A: Good afternoon, Grand Hotel. How may I help you? "
                "Speaker B: Hi, I'd like to book a room please. My name is Sarah Mitchell. "
                "Speaker A: Of course, Ms Mitchell. When would you like to check in? "
                "Speaker B: The fifteenth of March, please. "
                "Speaker A: And what type of room would you prefer? "
                "Speaker B: A double room, please. "
                "Speaker A: Lovely. How many nights will you be staying? "
                "Speaker B: Three nights. "
                "Speaker A: Do you have any special requests? "
                "Speaker B: Yes, I'd love a room with a sea view if possible."
            ),
            "form_title": "Hotel Booking Form",
            "fields": [
                {"label": "Guest Name", "value": "Sarah Mitchell"},
                {"label": "Check-in Date", "value": "15th March"},
                {"label": "Room Type", "value": "Double"},
                {"label": "Number of Nights", "value": "3"},
                {"label": "Special Request", "value": "Sea view"},
            ],
            "voice_accent": "en-GB"
        }
