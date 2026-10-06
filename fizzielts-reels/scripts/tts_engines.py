"""
Text to speech behind one interface, so the voice is a config change.

Every engine takes a line of text plus a rate multiplier and returns a mono
float32 waveform at its own sample rate. Nothing here knows about reels,
timing or mixing — build_audio.py owns all of that.

  piper        free, local, no account. The default.
  kokoro       free, local, warmer, heavier install.
  elevenlabs   paid; only ever contacted when the config selects it.
"""
from __future__ import annotations

import io
import os
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass
class Clip:
    samples: np.ndarray  # mono float32 in [-1, 1]
    rate: int


class Engine:
    name = "base"

    def say(self, text: str, rate: float = 1.0) -> Clip:  # pragma: no cover
        raise NotImplementedError


def _wav_bytes_to_clip(data: bytes) -> Clip:
    with wave.open(io.BytesIO(data), "rb") as w:
        rate = w.getframerate()
        raw = w.readframes(w.getnframes())
        channels = w.getnchannels()
    pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        pcm = pcm.reshape(-1, channels).mean(axis=1)
    return Clip(pcm, rate)


class PiperEngine(Engine):
    name = "piper"

    def __init__(self, cfg: dict, project_root: Path):
        from piper import PiperVoice, SynthesisConfig  # noqa: PLC0415

        model = Path(cfg.get("voicesDir", ".voices"))
        if not model.is_absolute():
            model = project_root / model
        model = model / f"{cfg['voice']}.onnx"
        if not model.exists():
            raise SystemExit(
                f"piper voice not found: {model}\nRun scripts/fetch_voices.sh first."
            )
        self._voice = PiperVoice.load(str(model))
        self._cfg = cfg
        self._SynthesisConfig = SynthesisConfig

    def say(self, text: str, rate: float = 1.0) -> Clip:
        # piper's length_scale stretches time, so a faster rate is a smaller scale.
        syn = self._SynthesisConfig(
            length_scale=self._cfg.get("lengthScale", 1.0) / max(rate, 0.1),
            noise_scale=self._cfg.get("noiseScale", 0.667),
            noise_w_scale=self._cfg.get("noiseW", 0.8),
        )
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            self._voice.synthesize_wav(text, w, syn_config=syn)
        return _wav_bytes_to_clip(buf.getvalue())


class KokoroEngine(Engine):
    name = "kokoro"

    def __init__(self, cfg: dict, project_root: Path):
        from kokoro import KPipeline  # noqa: PLC0415

        self._pipe = KPipeline(lang_code=cfg.get("langCode", "a"))
        self._cfg = cfg

    def say(self, text: str, rate: float = 1.0) -> Clip:
        chunks = [
            chunk.audio
            for chunk in self._pipe(
                text,
                voice=self._cfg.get("voice", "af_heart"),
                speed=self._cfg.get("speed", 1.0) * rate,
            )
        ]
        pcm = np.concatenate([np.asarray(c, dtype=np.float32).reshape(-1) for c in chunks])
        return Clip(pcm, 24000)


class ElevenLabsEngine(Engine):
    name = "elevenlabs"

    def __init__(self, cfg: dict, project_root: Path):
        key_env = cfg.get("apiKeyEnv", "ELEVENLABS_API_KEY")
        self._key = os.environ.get(key_env)
        if not self._key:
            raise SystemExit(f"{key_env} is not set, so the elevenlabs engine cannot run.")
        if not cfg.get("voiceId"):
            raise SystemExit("audio.config.json: engines.elevenlabs.voiceId is empty.")
        self._cfg = cfg

    def say(self, text: str, rate: float = 1.0) -> Clip:
        import json  # noqa: PLC0415
        import urllib.request  # noqa: PLC0415

        body = json.dumps(
            {
                "text": text,
                "model_id": self._cfg.get("modelId", "eleven_turbo_v2_5"),
                "voice_settings": {
                    "stability": self._cfg.get("stability", 0.4),
                    "similarity_boost": self._cfg.get("similarityBoost", 0.75),
                    "style": self._cfg.get("style", 0.45),
                    "use_speaker_boost": self._cfg.get("speakerBoost", True),
                    # The API has no rate control, so pacing comes from the script.
                },
            }
        ).encode()
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{self._cfg['voiceId']}"
            "?output_format=pcm_24000",
            data=body,
            headers={"xi-api-key": self._key, "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            pcm = np.frombuffer(resp.read(), dtype=np.int16).astype(np.float32) / 32768.0
        return Clip(pcm, 24000)


ENGINES = {
    "piper": PiperEngine,
    "kokoro": KokoroEngine,
    "elevenlabs": ElevenLabsEngine,
}


def build(name: str, config: dict, project_root: Path) -> Engine:
    if name not in ENGINES:
        raise SystemExit(f"unknown engine {name!r}; choose from {', '.join(ENGINES)}")
    return ENGINES[name](config.get("engines", {}).get(name, {}), project_root)
