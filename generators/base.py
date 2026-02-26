"""Abstract base class for all question type generators."""

from abc import ABC, abstractmethod


class BaseGenerator(ABC):
    """Base class for all question type generators.

    Each question type implements:
    - LLM prompt building
    - Response validation
    - Remotion props construction
    - Sample content for test mode
    """

    @property
    @abstractmethod
    def question_type(self) -> str:
        """Identifier used in content_plan.json, e.g., 'sentence_completion'."""

    @property
    @abstractmethod
    def remotion_composition_id(self) -> str:
        """Remotion composition ID in Root.tsx, e.g., 'SentenceCompletion'."""

    @property
    def exam_type(self) -> str:
        """'IELTS' or 'PTE'. Override in PTE generators."""
        return "IELTS"

    @abstractmethod
    def build_prompt(self, scenario: str, category: str) -> str:
        """Return the full LLM prompt for this question type."""

    @abstractmethod
    def validate_response(self, data: dict) -> bool:
        """Validate the LLM JSON response has all required fields.
        Raises ValueError if invalid."""

    @abstractmethod
    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        """Build the props dict to pass to Remotion render."""

    @abstractmethod
    def get_sample_content(self) -> dict:
        """Return sample content dict for --test mode."""

    def get_audio_script(self, content: dict) -> str:
        """Extract audio script from LLM response."""
        return content["audio_script"]

    def get_voice_accent(self, content: dict) -> str:
        """Get voice accent. Override for different accents."""
        return content.get("voice_accent", "en-GB")

    def get_output_prefix(self) -> str:
        """Filename prefix for output videos."""
        return self.question_type
