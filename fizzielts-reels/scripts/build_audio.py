#!/usr/bin/env python3
"""
Turn a narration script into the reel's finished audio track and the caption
timings that go with it.

Both come out of the same pass, which is the point: the karaoke captions are
not guessed from a word count, they are the measured position of each word in
the audio the viewer will hear.

    scripts/build_audio.py                      # every reel, engine from audio.config.json
    scripts/build_audio.py --engine kokoro      # A/B a different voice
    scripts/build_audio.py --slug listening-sports-complex

Writes, per reel:
    public/audio/<slug>.<engine>.mp3   mixed, ducked, normalised to -16 LUFS
    data/<slug>.audio.json             audioSrc + caption word timings in frames

The render reads data/<slug>.audio.json; nothing in the compositions knows
which engine produced the voice.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tts_engines  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
RATE = 48000  # working sample rate for the mix

# Chord bed, one chord per eight seconds, as semitone offsets from the root.
BED_ROOT_HZ = 174.614  # F3
BED_CHORDS = [[0, 4, 7, 12], [-3, 0, 5, 9], [-7, -3, 2, 5], [-5, 0, 4, 7]]
BED_CHORD_SECONDS = 8.0


# ── waveform helpers ─────────────────────────────────────────────────────────
def resample(x: np.ndarray, src: int, dst: int) -> np.ndarray:
    if src == dst:
        return x
    n = int(round(len(x) * dst / src))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def trim_silence(x: np.ndarray, rate: int, floor_db: float = -42.0) -> np.ndarray:
    """
    Drop the lead-in and tail-out silence a TTS engine pads a line with.

    Without this every line drifts later than its beat by however much padding
    the engine happened to add, which is how reveal timing silently rots.
    """
    win = max(1, rate // 200)
    if len(x) < win * 2:
        return x
    energy = np.sqrt(np.convolve(x.astype(np.float64) ** 2, np.ones(win) / win, mode="same"))
    peak = energy.max()
    if peak <= 0:
        return x
    loud = np.flatnonzero(energy > peak * (10 ** (floor_db / 20)))
    if len(loud) == 0:
        return x
    pad = rate // 50  # keep 20ms of air either side
    return x[max(0, loud[0] - pad): min(len(x), loud[-1] + pad)]


def db_to_gain(db: float) -> float:
    return float(10 ** (db / 20))


def ramp_envelope(n: int, spans: list[tuple[int, int]], level: float, base: float) -> np.ndarray:
    """Base gain everywhere, `level` inside each span, cosine ramps between."""
    env = np.full(n, base, dtype=np.float32)
    ramp = int(0.25 * RATE)
    for a, b in spans:
        a, b = max(0, a), min(n, b)
        if b <= a:
            continue
        env[a:b] = level
        for start, target_from, target_to in ((a - ramp, base, level), (b, level, base)):
            lo, hi = max(0, start), min(n, start + ramp)
            if hi > lo:
                t = (np.arange(hi - lo) + (lo - start)) / ramp
                env[lo:hi] = target_from + (target_to - target_from) * (1 - np.cos(np.pi * t)) / 2
    return env


# ── music bed ────────────────────────────────────────────────────────────────
def music_bed(seconds: float) -> np.ndarray:
    """
    A soft synthesised pad.

    Generated rather than sourced so the reels carry no third-party audio
    licence. Point `music.file` at a real track later and this drops out.
    """
    n = int(seconds * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    out = np.zeros(n, dtype=np.float32)

    chord_len = int(BED_CHORD_SECONDS * RATE)
    for ci in range(int(np.ceil(n / chord_len))):
        lo, hi = ci * chord_len, min(n, (ci + 1) * chord_len)
        tt = t[lo:hi] - t[lo]
        # Cross-fade the chords into each other so nothing steps.
        fade = np.minimum(1.0, np.minimum(tt, (hi - lo) / RATE - tt) / 1.2).clip(0, 1)
        for k, semis in enumerate(BED_CHORDS[ci % len(BED_CHORDS)]):
            f = BED_ROOT_HZ * 2 ** (semis / 12)
            # Two slightly detuned partials per note keeps it from sounding like a test tone.
            for detune, weight in ((1.0, 1.0), (1.003, 0.6)):
                lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.07 + 0.013 * k) * (t[lo:hi]) + k)
                out[lo:hi] += (
                    weight * fade * lfo * np.sin(2 * np.pi * f * detune * tt + k * 1.7) / 7
                )

    # A breath of filtered air over the top.
    rng = np.random.default_rng(7)
    air = rng.standard_normal(n).astype(np.float32)
    for _ in range(6):  # repeated one-pole lowpass ~ a gentle 6-pole filter
        air = np.convolve(air, np.ones(48, dtype=np.float32) / 48, mode="same")
    out += air / max(np.abs(air).max(), 1e-9) * 0.05

    # Keep the pad out of the voice's range.
    for _ in range(2):
        out = np.convolve(out, np.ones(12, dtype=np.float32) / 12, mode="same")

    peak = float(np.abs(out).max())
    return (out / peak * 0.9).astype(np.float32) if peak > 0 else out


# ── word timings ─────────────────────────────────────────────────────────────
WORD_RE = re.compile(r"[A-Za-z0-9’'\.À-ɏ]+")


def spoken_words(text: str) -> list[str]:
    """Caption tokens: what a viewer reads, not what the engine pronounces."""
    out = []
    for raw in text.replace("—", " ").split():
        token = raw.strip(" ,.;:!?\"()")
        if token:
            out.append(raw.strip(" ()\""))
    return out


def align_line(clip: np.ndarray, rate: int, text: str, aligner) -> list[tuple[str, float, float]]:
    """
    Word positions inside one synthesised line, in seconds from its start.

    Forced alignment when a model is available; otherwise the words are spread
    across the line by length, which stays in sync at the line level and can
    drift by at most a syllable inside it.
    """
    words = spoken_words(text)
    if aligner is not None:
        try:
            return aligner(clip, rate, text, words)
        except Exception as exc:  # noqa: BLE001 - degrade, never fail the build
            print(f"  ! alignment failed ({exc}); spacing words by length", file=sys.stderr)
    dur = len(clip) / rate
    weights = np.array([max(1, len(w)) for w in words], dtype=np.float64)
    edges = np.concatenate([[0.0], np.cumsum(weights / weights.sum()) * dur])
    return [(w, float(edges[i]), float(edges[i + 1])) for i, w in enumerate(words)]


def make_aligner():
    """WhisperX forced alignment, or None when it is not installed."""
    try:
        import torch  # noqa: PLC0415
        import whisperx  # noqa: PLC0415
    except Exception:  # noqa: BLE001
        print("whisperx not available; caption timings will be spaced by word length")
        return None

    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        model, meta = whisperx.load_align_model(language_code="en", device=device)
    except Exception as exc:  # noqa: BLE001
        print(f"could not load the alignment model ({exc}); spacing words by length")
        return None

    def align(clip: np.ndarray, rate: int, text: str, words: list[str]):
        audio = resample(clip, rate, 16000)
        result = whisperx.align(
            [{"start": 0.0, "end": len(audio) / 16000, "text": text}],
            model, meta, audio, device, return_char_alignments=False,
        )
        got = [w for seg in result["segments"] for w in seg.get("words", [])]
        timed, cursor = [], 0.0
        for i, word in enumerate(words):
            hit = got[i] if i < len(got) else None
            start = hit.get("start") if hit else None
            end = hit.get("end") if hit else None
            start = cursor if start is None else float(start)
            end = max(start + 0.08, cursor + 0.08) if end is None else float(end)
            timed.append((word, start, end))
            cursor = end
        return timed

    return align


# ── the build ────────────────────────────────────────────────────────────────
def build(slug: str, config: dict, engine, engine_name: str, aligner) -> dict:
    script = json.loads((ROOT / "data" / f"{slug}.narration.json").read_text())
    props = json.loads((ROOT / "data" / f"{slug}.json").read_text())
    total_frames = props["durationInFrames"]
    total_samples = int(total_frames / FPS * RATE) + RATE // 2

    voice = np.zeros(total_samples, dtype=np.float32)
    captions: list[dict] = []
    speech_spans: list[tuple[int, int]] = []
    cursor = 0.0  # seconds; where the previous line finished

    for i, line in enumerate(script["lines"]):
        clip = engine.say(line["text"], rate=line.get("rate", 1.0))
        pcm = trim_silence(resample(clip.samples, clip.rate, RATE), RATE)
        if line.get("emphasis"):
            pcm = pcm * 1.12  # a touch more presence on the answer itself

        start = max(cursor, line["atFrame"] / FPS)
        at = int(start * RATE)
        if at + len(pcm) > len(voice):
            voice = np.pad(voice, (0, at + len(pcm) - len(voice)))
        voice[at: at + len(pcm)] += pcm
        speech_spans.append((at, at + len(pcm)))

        for word, w_start, w_end in align_line(pcm, RATE, line["text"], aligner):
            captions.append({
                "word": word,
                "startFrame": int(round((start + w_start) * FPS)),
                "endFrame": int(round((start + w_end) * FPS)),
            })

        cursor = start + len(pcm) / RATE + line.get("pauseAfter", 0.22)
        print(f"  line {i + 1:2d}  f{int(start * FPS):4d}-{int(cursor * FPS):4d}  {line['text'][:52]}")

    # Captions must stay monotonic even if a line was alignment-shuffled.
    for a, b in zip(captions, captions[1:]):
        b["startFrame"] = max(b["startFrame"], a["startFrame"] + 1)

    peak = float(np.abs(voice).max())
    if peak > 0:
        voice = voice / peak * 0.89

    mix = voice.copy()
    music_cfg = config.get("music", {})
    if music_cfg.get("enabled", True):
        bed = music_bed(len(voice) / RATE)
        bed = (bed[: len(voice)] if len(bed) >= len(voice)
               else np.pad(bed, (0, len(voice) - len(bed))))
        # "-28dB under the voice" measured against the voice's own speaking level.
        speaking = np.concatenate([voice[a:b] for a, b in speech_spans]) if speech_spans else voice
        voice_rms = float(np.sqrt(np.mean(speaking.astype(np.float64) ** 2))) or 1e-6
        bed_rms = float(np.sqrt(np.mean(bed.astype(np.float64) ** 2))) or 1e-6
        bed = bed * (voice_rms * db_to_gain(music_cfg.get("bedDb", -28)) / bed_rms)

        frames_to_samples = lambda f: int(f / FPS * RATE)  # noqa: E731
        env = ramp_envelope(
            len(bed),
            [(frames_to_samples(d["from"]), frames_to_samples(d["to"]))
             for d in script.get("duckFrames", [])],
            db_to_gain(music_cfg.get("duckDb", -36) - music_cfg.get("bedDb", -28)),
            1.0,
        )
        env *= ramp_envelope(
            len(bed),
            [(frames_to_samples(m["from"]), frames_to_samples(m["to"]))
             for m in script.get("musicMuteFrames", [])],
            0.0,
            1.0,
        )
        # Fade the bed in and out so the reel neither starts nor ends on a cut.
        tail = min(int(1.2 * RATE), len(bed) // 4)
        env[:tail] *= np.linspace(0, 1, tail)
        env[-tail:] *= np.linspace(1, 0, tail)
        mix = mix + bed * env

    out_dir = ROOT / "public" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    rel = f"audio/{slug}.{engine_name}.mp3"
    master(mix, out_dir / f"{slug}.{engine_name}.mp3", config.get("master", {}))

    sidecar = {
        "comment": "Generated by scripts/build_audio.py — do not hand-edit. "
                   "Edit data/<slug>.narration.json and rebuild.",
        "engine": engine_name,
        "audioSrc": rel,
        "audioDurationInFrames": int(len(mix) / RATE * FPS),
        "captions": [{"word": c["word"], "startFrame": c["startFrame"]} for c in captions],
    }
    (ROOT / "data" / f"{slug}.audio.json").write_text(json.dumps(sidecar, indent=2) + "\n")
    return sidecar


def master(mix: np.ndarray, out: Path, cfg: dict) -> None:
    """Two-pass loudnorm to the target LUFS, then mp3."""
    lufs = cfg.get("lufs", -16)
    peak = cfg.get("truePeakDb", -1.5)
    pcm = np.clip(mix, -1, 1)
    raw = (pcm * 32767).astype("<i2").tobytes()

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "mix.wav"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1",
             "-i", "-", str(wav)],
            input=raw, check=True,
        )
        filt = f"loudnorm=I={lufs}:TP={peak}:LRA=11"
        probe = subprocess.run(
            ["ffmpeg", "-v", "info", "-i", str(wav), "-af", filt, "-f", "null", "-"],
            capture_output=True, text=True, check=True,
        ).stderr
        measured = {
            k: v for k, v in re.findall(r'"(input_\w+)"\s*:\s*"([-\d.inf]+)"', probe)
        }
        if len(measured) >= 4:
            filt += (
                f":measured_I={measured['input_i']}:measured_TP={measured['input_tp']}"
                f":measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}"
                ":linear=true:print_format=summary"
            )
        # loudnorm's linear mode is conservative, and the mp3 encode shifts the
        # result again, so the encoded file is measured and corrected rather
        # than trusted. One correction pass is always enough in practice.
        trim = 0.0
        for _ in range(3):
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-af",
                 f"{filt},volume={trim:+.2f}dB",
                 "-ar", "48000", "-ac", "2", "-b:a", "192k", str(out)],
                check=True,
            )
            got = integrated_lufs(out)
            if got is None or abs(got - lufs) <= 0.3:
                break
            trim += lufs - got
    print(f"  -> {out.relative_to(ROOT)}  ({got if got is not None else lufs:.1f} LUFS)")


def integrated_lufs(path: Path) -> float | None:
    """Integrated loudness of a finished file, as ffmpeg's ebur128 measures it."""
    log = subprocess.run(
        ["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    found = re.findall(r"I:\s*(-?[\d.]+) LUFS", log)
    return float(found[-1]) if found else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", help="override audio.config.json's engine")
    ap.add_argument("--slug", action="append", help="build only this reel (repeatable)")
    args = ap.parse_args()

    config = json.loads((ROOT / "audio.config.json").read_text())
    engine_name = args.engine or config["engine"]
    engine = tts_engines.build(engine_name, config, ROOT)
    aligner = make_aligner()

    slugs = args.slug or sorted(
        p.name[: -len(".narration.json")] for p in (ROOT / "data").glob("*.narration.json")
    )
    for slug in slugs:
        print(f"{slug}  [{engine_name}]")
        build(slug, config, engine, engine_name, aligner)


if __name__ == "__main__":
    main()
