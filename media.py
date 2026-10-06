"""ffmpeg / ffprobe discovery.

The pipeline shells out to ffmpeg for thumbnails and for appending the CTA clip.
Both call sites used a bare "ffmpeg", which fails silently-ish when it is not on
PATH: the reel still uploads, just without a thumbnail or a CTA. This resolves a
usable binary once and reports clearly when there is none.

Lookup order:
  1. FFMPEG_BINARY / FFPROBE_BINARY env var
  2. the binary on PATH
  3. the ffmpeg bundled with imageio-ffmpeg, if installed (no system install
     needed — handy on a fresh Windows box)
"""

from __future__ import annotations

import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path


class FFmpegNotFound(RuntimeError):
    """Raised when neither PATH nor imageio-ffmpeg yields a usable binary."""


def _from_imageio() -> str | None:
    try:
        import imageio_ffmpeg  # type: ignore[import-not-found]
    except ImportError:
        return None
    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


@lru_cache(maxsize=None)
def _resolve(name: str, env_var: str) -> str | None:
    override = os.environ.get(env_var)
    if override:
        if Path(override).exists() or shutil.which(override):
            return override
        print(f"  WARNING: {env_var}={override} does not exist; ignoring.")

    found = shutil.which(name)
    if found:
        return found

    if name == "ffmpeg":
        return _from_imageio()

    # imageio only ships ffmpeg, but ffmpeg's own directory usually has ffprobe.
    bundled = _from_imageio()
    if bundled:
        sibling = Path(bundled).with_name("ffprobe" + Path(bundled).suffix)
        if sibling.exists():
            return str(sibling)

    return None


def ffmpeg_bin(required: bool = True) -> str | None:
    """Path to an ffmpeg binary. Raises FFmpegNotFound if required and missing."""
    path = _resolve("ffmpeg", "FFMPEG_BINARY")
    if path is None and required:
        raise FFmpegNotFound(
            "ffmpeg not found. Install it (winget install Gyan.FFmpeg / "
            "apt install ffmpeg / brew install ffmpeg), set FFMPEG_BINARY to its "
            "full path, or `pip install imageio-ffmpeg` for a bundled build."
        )
    return path


def ffprobe_bin(required: bool = False) -> str | None:
    """Path to an ffprobe binary, or None when only ffmpeg is available."""
    path = _resolve("ffprobe", "FFPROBE_BINARY")
    if path is None and required:
        raise FFmpegNotFound("ffprobe not found. Install ffmpeg or set FFPROBE_BINARY.")
    return path


def have_ffmpeg() -> bool:
    return _resolve("ffmpeg", "FFMPEG_BINARY") is not None


def audio_duration(path: Path) -> float | None:
    """Duration of an audio/video file in seconds, via ffprobe. None on failure."""
    probe = ffprobe_bin()
    if probe is None:
        return None

    result = subprocess.run(
        [
            probe, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        return None
    try:
        return float(result.stdout.strip())
    except ValueError:
        return None


if __name__ == "__main__":
    print(f"ffmpeg:  {ffmpeg_bin(required=False) or 'NOT FOUND'}")
    print(f"ffprobe: {ffprobe_bin() or 'NOT FOUND'}")
