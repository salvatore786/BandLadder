"""Cue Card (Speaking Part 2) generator — IELTS Speaking.

Generates a cue-card topic with bullet points and a Band 7+ model answer.
Audio is produced per-sentence for precise highlight synchronisation in the
Remotion composition.
"""

import asyncio
import shutil
import sys
import tempfile
from pathlib import Path

from pydub import AudioSegment

from .base import BaseGenerator


class CueCardGenerator(BaseGenerator):

    @property
    def question_type(self) -> str:
        return "cue_card"

    @property
    def remotion_composition_id(self) -> str:
        return "CueCard"

    @property
    def exam_type(self) -> str:
        return "IELTS"

    def get_output_prefix(self) -> str:
        return "cue_card"

    # ── LLM Prompt ───────────────────────────────────────────────────────────
    def build_prompt(self, scenario: str, category: str) -> str:
        return f"""Generate an IELTS Speaking Part 2 (Cue Card) exercise with a model answer.
Scenario: {scenario}
Category: {category}

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "title": "Speaking Part 2 - Cue Card",
  "scenario_description": "Brief 1-line description shown on screen (max 60 chars)",
  "topic": "Describe a [topic]. For example: 'Describe a book that you recently read.'",
  "bullet_points": [
    "what the [topic] was about",
    "why you chose to [action]",
    "how it made you feel",
    "and explain whether you would recommend it to others"
  ],
  "model_answer_sentences": [
    "First sentence of the model answer.",
    "Second sentence continuing the response.",
    "Third sentence with more detail.",
    "Fourth sentence expanding on the topic.",
    "Fifth sentence providing personal reflection.",
    "Sixth sentence with further elaboration.",
    "Seventh sentence approaching conclusion.",
    "Eighth sentence wrapping up the answer."
  ],
  "audio_script": "All model_answer_sentences joined with spaces into one paragraph.",
  "voice_accent": "en-GB"
}}

IMPORTANT RULES:
- The topic MUST follow the IELTS Speaking Part 2 format: "Describe a [noun/experience]."
- Provide exactly 3 or 4 bullet points in the "You should say" format.
- The last bullet point should start with "and explain..."
- The model_answer_sentences array must have 6 to 10 sentences.
- Each sentence should be 15-25 words, natural spoken English.
- Demonstrate Band 7+ speaking: varied vocabulary, discourse markers, natural delivery.
- The audio_script is all model_answer_sentences joined with spaces.
- Total speaking time should be approximately 45-75 seconds when read aloud.
- Return ONLY the JSON object, nothing else."""

    # ── Validation ───────────────────────────────────────────────────────────
    def validate_response(self, data: dict) -> bool:
        required = [
            "title", "scenario_description", "topic",
            "bullet_points", "model_answer_sentences",
            "audio_script", "voice_accent",
        ]
        for key in required:
            if key not in data:
                raise ValueError(f"Missing key: {key}")

        bp = data["bullet_points"]
        if not isinstance(bp, list) or not (3 <= len(bp) <= 4):
            raise ValueError(f"Need 3-4 bullet points, got {len(bp) if isinstance(bp, list) else type(bp)}")

        ms = data["model_answer_sentences"]
        if not isinstance(ms, list) or not (6 <= len(ms) <= 10):
            raise ValueError(f"Need 6-10 model answer sentences, got {len(ms) if isinstance(ms, list) else type(ms)}")

        return True

    # ── Per-Sentence Audio Generation ────────────────────────────────────────
    def generate_per_sentence_audio(
        self,
        sentences: list[str],
        voice: str,
        output_path: Path,
    ) -> tuple[float, list[dict]]:
        """Generate TTS per-sentence, merge, return (total_duration, timings).

        Returns
        -------
        total_duration : float
            Duration in seconds of the merged audio.
        timings : list[dict]
            Per-sentence timing data::

                [{"index": 0, "startTime": 0.0, "endTime": 3.5, "text": "..."},
                 {"index": 1, "startTime": 3.8, "endTime": 7.2, "text": "..."}, ...]
        """
        import edge_tts  # local import — only needed here

        # Ensure Windows event-loop policy is set for edge-tts
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

        temp_dir = Path(tempfile.mkdtemp(prefix="cue_card_"))
        combined = AudioSegment.empty()
        timings: list[dict] = []
        silence_gap = AudioSegment.silent(duration=300)  # 300 ms between sentences
        current_time = 0.0

        try:
            for i, sentence in enumerate(sentences):
                sentence = sentence.strip()
                if not sentence:
                    continue

                temp_file = temp_dir / f"sent_{i:02d}.mp3"

                # Generate TTS for this single sentence
                async def _tts(text: str, v: str, path: str):
                    communicate = edge_tts.Communicate(text, v)
                    await communicate.save(path)

                asyncio.run(_tts(sentence, voice, str(temp_file)))

                segment = AudioSegment.from_mp3(str(temp_file))
                seg_duration = len(segment) / 1000.0

                start_time = current_time

                # Insert silence gap between sentences (not before the first)
                if len(combined) > 0:
                    combined += silence_gap
                    current_time += 0.3
                    start_time = current_time

                combined += segment
                current_time += seg_duration

                timings.append({
                    "index": i,
                    "startTime": round(start_time, 3),
                    "endTime": round(current_time, 3),
                    "text": sentence,
                })

                print(f"    Sentence {i + 1}/{len(sentences)}: {seg_duration:.1f}s  [{start_time:.1f}-{current_time:.1f}s]")

            combined.export(str(output_path), format="mp3")
            total_duration = len(combined) / 1000.0
            print(f"  Cue-card audio: {total_duration:.1f}s ({len(timings)} sentences)")
            return total_duration, timings

        finally:
            shutil.rmtree(str(temp_dir), ignore_errors=True)

    # ── Remotion Props ───────────────────────────────────────────────────────
    def build_remotion_props(self, content: dict, duration: float, audio_filename: str) -> dict:
        sentence_timings = content.get("sentence_timings", [])
        cue_card_display_duration = 10.0  # seconds to show the card

        return {
            "topic": content["topic"],
            "bulletPoints": content["bullet_points"],
            "modelAnswerSentences": content["model_answer_sentences"],
            "sentenceTimings": sentence_timings,
            "cueCardDisplayDuration": cue_card_display_duration,
            "category": content.get("category", ""),
            "scenarioDescription": content["scenario_description"],
            # Total duration: audio + cue card display + buffer
            "durationSeconds": round(duration + cue_card_display_duration + 2, 2),
            "audioDurationSeconds": round(duration, 2),
            "audioFileName": audio_filename,
            "examType": self.exam_type,
            "backgroundMusicFileName": "bg_music_soft.mp3",
            "sectionLabel": "Speaking",
        }

    # ── Sample Content (--test mode) ─────────────────────────────────────────
    def get_sample_content(self) -> dict:
        return {
            "title": "Speaking Part 2 - Cue Card",
            "scenario_description": "Describe a memorable book you read",
            "topic": "Describe a book that you recently read.",
            "bullet_points": [
                "what the book was about",
                "why you chose to read it",
                "how long it took you to read it",
                "and explain whether you would recommend it to others",
            ],
            "model_answer_sentences": [
                "I'd like to talk about a fascinating book I read last month called Sapiens by Yuval Noah Harari.",
                "The book is essentially a brief history of humankind, covering everything from the Stone Age to the modern era.",
                "I chose to read it because several of my colleagues had recommended it enthusiastically during our lunch conversations.",
                "It took me roughly three weeks to finish, as I found myself reading a chapter or two each evening before bed.",
                "What really struck me was how the author manages to make complex historical concepts incredibly accessible and engaging.",
                "The chapters on the Agricultural Revolution were particularly eye-opening, challenging many assumptions I had about early human societies.",
                "I would absolutely recommend this book to anyone who is curious about how the world came to be the way it is today.",
                "In fact, I've already lent my copy to a friend who has been looking for something thought-provoking to read.",
            ],
            "audio_script": (
                "I'd like to talk about a fascinating book I read last month called Sapiens by Yuval Noah Harari. "
                "The book is essentially a brief history of humankind, covering everything from the Stone Age to the modern era. "
                "I chose to read it because several of my colleagues had recommended it enthusiastically during our lunch conversations. "
                "It took me roughly three weeks to finish, as I found myself reading a chapter or two each evening before bed. "
                "What really struck me was how the author manages to make complex historical concepts incredibly accessible and engaging. "
                "The chapters on the Agricultural Revolution were particularly eye-opening, challenging many assumptions I had about early human societies. "
                "I would absolutely recommend this book to anyone who is curious about how the world came to be the way it is today. "
                "In fact, I've already lent my copy to a friend who has been looking for something thought-provoking to read."
            ),
            "voice_accent": "en-GB",
        }
