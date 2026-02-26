"""Table Completion generator — IELTS Listening."""

from .base import BaseGenerator


class TableCompletionGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "table_completion"

    @property
    def remotion_composition_id(self) -> str:
        return "TableCompletion"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Table Completion exercise.
Scenario: {scenario}, Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Table Completion",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between two speakers about the scenario. Include Speaker A and Speaker B labels.",
  "table_title": "Title above the table (e.g., 'Course Schedule', 'Price Comparison')",
  "headers": ["Column 1", "Column 2", "Column 3"],
  "rows": [
    {{"cells": ["Value", "___", "Value"], "answers": ["answer for blank"]}},
    {{"cells": ["___", "Value", "Value"], "answers": ["answer for blank"]}},
    {{"cells": ["Value", "Value", "___"], "answers": ["answer for blank"]}}
  ],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script must be a realistic, natural dialogue of about 45 seconds.
- Provide exactly 3 column headers and 3 rows.
- Each row has exactly 3 cells. Use "___" for blanks (1 blank per row).
- Each row's answers array has exactly 1 answer matching the blank.
- Table data should be factual info from the dialogue.
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "table_title", "headers", "rows", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        if len(data["headers"]) != 3:
            raise ValueError("Need exactly 3 headers")
        if len(data["rows"]) != 3:
            raise ValueError("Need exactly 3 rows")
        for i, row in enumerate(data["rows"]):
            if "cells" not in row or "answers" not in row:
                raise ValueError(f"Row {i} must have 'cells' and 'answers'")
            if len(row["cells"]) != 3:
                raise ValueError(f"Row {i} must have exactly 3 cells")
            blanks = sum(1 for c in row["cells"] if c == "___")
            if blanks != len(row["answers"]):
                raise ValueError(f"Row {i}: blanks count ({blanks}) != answers count ({len(row['answers'])})")
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "tableTitle": content["table_title"],
            "headers": content["headers"],
            "rows": content["rows"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),       # Total video = audio + 4s
            "audioDurationSeconds": round(duration, 2),       # Raw audio length
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Table Completion",
            "scenario_description": "A tutor explaining the weekly class timetable",
            "audio_script": (
                "Speaker A: Could you tell me about the schedule for next term? "
                "Speaker B: Of course. On Mondays, the lecture starts at ten in the morning in Room 204. "
                "Speaker A: And Wednesdays? "
                "Speaker B: Wednesday sessions are at half past two in Lab B. "
                "Speaker A: What about the end of the week? "
                "Speaker B: The Friday tutorial is first thing at nine o'clock in Room 107. "
                "Speaker A: Are there any other sessions? "
                "Speaker B: There's an optional workshop on Thursdays, but attendance isn't compulsory."
            ),
            "table_title": "Course Schedule",
            "headers": ["Day", "Time", "Room"],
            "rows": [
                {"cells": ["Monday", "___", "Room 204"], "answers": ["10:00 AM"]},
                {"cells": ["Wednesday", "2:30 PM", "___"], "answers": ["Lab B"]},
                {"cells": ["___", "9:00 AM", "Room 107"], "answers": ["Friday"]},
            ],
            "voice_accent": "en-GB"
        }
