"""Matching / Classification generator — IELTS Listening (Dialogue version).

Requires the MatchingClassification Remotion composition.
Items must be classified into categories based on dialogue information.
"""

from .base import BaseGenerator


class MatchingClassificationGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "matching_classification"

    @property
    def remotion_composition_id(self) -> str:
        return "MatchingClassification"

    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Listening Matching / Classification exercise.
Scenario: {scenario}, Category: {category}

The audio MUST be a natural, realistic DIALOGUE between two people:
- Speaker A: Someone asking about or comparing different options/categories.
- Speaker B: Someone knowledgeable who explains which items belong to which category.

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Matching / Classification",
  "scenario_description": "Brief 1-line description shown on screen",
  "audio_script": "A natural 45-second dialogue between Speaker A and Speaker B. They discuss items and which categories they belong to. Include 'Speaker A:' and 'Speaker B:' labels before each turn.",
  "categories": ["Category A name", "Category B name", "Category C name"],
  "items": [
    {{"text": "Item description 1", "categoryIndex": 0}},
    {{"text": "Item description 2", "categoryIndex": 1}},
    {{"text": "Item description 3", "categoryIndex": 2}},
    {{"text": "Item description 4", "categoryIndex": 0}},
    {{"text": "Item description 5", "categoryIndex": 1}}
  ],
  "voice_accent": "en-GB"
}}

IMPORTANT:
- The audio_script MUST be a two-person dialogue with Speaker A and Speaker B labels.
- Provide exactly 3 categories and exactly 5 items.
- Each item's categoryIndex (0-based) indicates which category it belongs to.
- Distribute items across categories (at least 1 item per category).
- The dialogue should naturally mention which items go with which categories.
- Items should be brief (3-8 words each) to fit the visual layout.
- Category names should be concise (1-3 words).
- Return ONLY the JSON object, nothing else."""

    def validate_response(self, data: dict) -> bool:
        required = ["title", "scenario_description", "audio_script",
                     "categories", "items", "voice_accent"]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        cats = data["categories"]
        items = data["items"]
        if len(cats) < 2 or len(cats) > 4:
            raise ValueError(f"Need 2-4 categories, got {len(cats)}")
        if len(items) < 4 or len(items) > 6:
            raise ValueError(f"Need 4-6 items, got {len(items)}")
        for i, item in enumerate(items):
            if "text" not in item or "categoryIndex" not in item:
                raise ValueError(f"Item {i} must have 'text' and 'categoryIndex'")
            if not (0 <= item["categoryIndex"] < len(cats)):
                raise ValueError(
                    f"Item {i} categoryIndex {item['categoryIndex']} "
                    f"out of range for {len(cats)} categories"
                )
        return True

    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        return {
            "categories": content["categories"],
            "items": content["items"],
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            "durationSeconds": round(duration + 4, 2),
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
            "examType": self.exam_type,
        }

    def get_sample_content(self) -> dict:
        return {
            "title": "Matching / Classification",
            "scenario_description": "Two students compare features of university libraries",
            "audio_script": (
                "Speaker A: I'm trying to decide which library to use this term. "
                "What's the difference between the Main Library and the Science Library? "
                "Speaker B: Well, the Main Library has a huge collection of humanities books "
                "and a dedicated quiet study zone. "
                "Speaker A: And the Science Library? "
                "Speaker B: That one has all the lab manuals and technical journals. "
                "It also has computer workstations for data analysis. "
                "Speaker A: What about group study rooms? "
                "Speaker B: Both libraries have those, actually. You can book them online. "
                "Speaker A: Good to know. Is there a cafe in either of them? "
                "Speaker B: Only the Main Library has a cafe on the ground floor. "
                "The Science Library just has vending machines."
            ),
            "categories": ["Main Library", "Science Library", "Both"],
            "items": [
                {"text": "Quiet study zone", "categoryIndex": 0},
                {"text": "Technical journals", "categoryIndex": 1},
                {"text": "Group study rooms", "categoryIndex": 2},
                {"text": "On-site cafe", "categoryIndex": 0},
                {"text": "Computer workstations", "categoryIndex": 1},
            ],
            "voice_accent": "en-GB",
        }
