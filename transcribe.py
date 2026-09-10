"""Word-level timings for reel audio, via WhisperX.

Why: every timing in the reels used to be a guess — sentences appeared at fixed
percentages of the audio, answers revealed at `audio_duration + 1s`. TTS pacing
varies, so text regularly drifted out of sync with the voice. WhisperX runs ASR
and then wav2vec2 forced alignment over the generated audio, giving per-word
start/end times. Those drive the burned-in karaoke captions (see
`remotion-video/src/shared/CaptionTrack.tsx`) and let the reveal timings key off
real speech instead of percentages.

Everything degrades gracefully: if WhisperX (or faster-whisper) is not
installed, `transcribe_words()` returns an empty list, captions are skipped and
the reel renders exactly as it did before.

Config via env:
  WHISPER_MODEL         whisper size — tiny/base/small/medium/large-v3 (default: base)
  WHISPER_DEVICE        cpu | cuda (default: cuda when available, else cpu)
  WHISPER_COMPUTE_TYPE  int8 | float16 | float32 (default: int8 on cpu, float16 on cuda)
  WHISPER_BATCH_SIZE    default 8
  WHISPER_DISABLE       set to 1 to skip transcription entirely
"""

from __future__ import annotations

import json
import os
from pathlib import Path

__all__ = ["transcribe_words", "load_cached_words", "backend_available", "Word"]

Word = dict  # {"word": str, "start": float, "end": float}

_CACHE_SUFFIX = ".words.json"


# ── Settings ─────────────────────────────────────────────────────────────────
def _model_name() -> str:
    return os.environ.get("WHISPER_MODEL", "base")


def _device() -> str:
    device = os.environ.get("WHISPER_DEVICE")
    if device:
        return device
    try:
        import torch  # type: ignore[import-not-found]

        return "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
        return "cpu"


def _compute_type(device: str) -> str:
    return os.environ.get(
        "WHISPER_COMPUTE_TYPE", "float16" if device == "cuda" else "int8"
    )


def backend_available() -> str | None:
    """Name of the transcription backend that can be used, or None."""
    if os.environ.get("WHISPER_DISABLE") == "1":
        return None
    try:
        import whisperx  # noqa: F401

        return "whisperx"
    except ImportError:
        pass
    try:
        import faster_whisper  # noqa: F401

        return "faster-whisper"
    except ImportError:
        return None


# ── Cache ────────────────────────────────────────────────────────────────────
def _cache_path(audio_path: Path) -> Path:
    return audio_path.with_suffix(audio_path.suffix + _CACHE_SUFFIX)


def load_cached_words(audio_path: Path) -> list[Word] | None:
    cache = _cache_path(audio_path)
    if not cache.exists():
        return None
    try:
        with open(cache, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else None
    except (json.JSONDecodeError, OSError):
        return None


# ── Backends ─────────────────────────────────────────────────────────────────
def _clean(words: list[dict]) -> list[Word]:
    """Keep only words with usable timings, in order, with no overlaps."""
    cleaned: list[Word] = []
    for w in words:
        text = str(w.get("word", "")).strip()
        start, end = w.get("start"), w.get("end")
        if not text or start is None or end is None:
            # WhisperX leaves start/end off words it could not align
            # (usually pure punctuation or numerals) — dropping them is right.
            continue
        start, end = float(start), float(end)
        if end < start:
            continue
        if cleaned and start < cleaned[-1]["end"]:
            start = cleaned[-1]["end"]
            end = max(end, start)
        cleaned.append({"word": text, "start": round(start, 3), "end": round(end, 3)})
    return cleaned


def _via_whisperx(audio_path: Path, language: str) -> list[Word]:
    import whisperx

    device = _device()
    compute_type = _compute_type(device)
    batch_size = int(os.environ.get("WHISPER_BATCH_SIZE", "8"))

    print(f"  WhisperX: {_model_name()} on {device} ({compute_type})")
    audio = whisperx.load_audio(str(audio_path))

    model = whisperx.load_model(
        _model_name(), device, compute_type=compute_type, language=language
    )
    result = model.transcribe(audio, batch_size=batch_size)

    # Forced alignment is what turns segment-level output into word-level.
    align_model, metadata = whisperx.load_align_model(
        language_code=result.get("language", language), device=device
    )
    aligned = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    words = aligned.get("word_segments") or []
    if not words:
        words = [w for seg in aligned.get("segments", []) for w in seg.get("words", [])]
    return _clean(words)


def _via_faster_whisper(audio_path: Path, language: str) -> list[Word]:
    from faster_whisper import WhisperModel

    device = _device()
    print(f"  faster-whisper: {_model_name()} on {device} (no forced alignment)")
    model = WhisperModel(
        _model_name(), device=device, compute_type=_compute_type(device)
    )
    segments, _info = model.transcribe(
        str(audio_path), language=language, word_timestamps=True
    )

    words: list[dict] = []
    for segment in segments:
        for w in segment.words or []:
            words.append({"word": w.word, "start": w.start, "end": w.end})
    return _clean(words)


# ── Public API ───────────────────────────────────────────────────────────────
def transcribe_words(
    audio_path: Path,
    language: str = "en",
    use_cache: bool = True,
) -> list[Word]:
    """Word-level timings for `audio_path`, relative to the start of the file.

    Returns [] when no backend is installed or transcription fails — callers
    should treat that as "no captions" rather than an error.
    """
    audio_path = Path(audio_path)
    if not audio_path.exists():
        print(f"  WARNING: audio not found for transcription: {audio_path}")
        return []

    if use_cache:
        cached = load_cached_words(audio_path)
        if cached is not None:
            print(f"  Word timings: {len(cached)} words (cached)")
            return cached

    backend = backend_available()
    if backend is None:
        if os.environ.get("WHISPER_DISABLE") == "1":
            print("  Word timings: skipped (WHISPER_DISABLE=1)")
        else:
            print(
                "  Word timings: skipped — no backend. "
                "Run `pip install whisperx` to enable karaoke captions."
            )
        return []

    try:
        if backend == "whisperx":
            words = _via_whisperx(audio_path, language)
        else:
            words = _via_faster_whisper(audio_path, language)
    except Exception as exc:  # transcription must never break a render
        print(f"  WARNING: transcription failed ({type(exc).__name__}: {exc})")
        return []

    print(f"  Word timings: {len(words)} words aligned")

    if use_cache and words:
        try:
            with open(_cache_path(audio_path), "w", encoding="utf-8") as f:
                json.dump(words, f, ensure_ascii=False)
        except OSError as exc:
            print(f"  WARNING: could not cache word timings: {exc}")

    return words


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("audio", nargs="?", help="audio file to align")
    parser.add_argument("-o", "--out", help="write the word JSON here instead of stdout")
    parser.add_argument("--language", default="en")
    args = parser.parse_args()

    if not args.audio:
        print(f"backend: {backend_available() or 'none installed'}")
        raise SystemExit(1)

    result = transcribe_words(Path(args.audio), language=args.language, use_cache=False)
    payload = json.dumps(result, indent=2, ensure_ascii=False)

    if args.out:
        # Progress goes to stdout, so a caller that wants clean JSON asks for a
        # file rather than trying to parse the log.
        Path(args.out).write_text(payload, encoding="utf-8")
        print(f"  Wrote {len(result)} words to {args.out}")
    else:
        print(payload)
