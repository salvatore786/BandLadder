"""One-shot setup for the reel toolchain: ffmpeg, Remotion + three.js, WhisperX.

Run this on a fresh machine (or after pulling these changes) before the daily
pipeline:

    python setup_reels_deps.py            # check what is missing, install it
    python setup_reels_deps.py --check    # report only, install nothing
    python setup_reels_deps.py --skip-whisper   # skip the ~2.5 GB torch download

What it sets up
  ffmpeg     thumbnails + CTA concat. Uses a system install if present,
             otherwise falls back to the pip-installed imageio-ffmpeg build.
  Remotion   `npm install` in remotion-video/, which now also pulls three.js,
             @remotion/three and @remotion/captions.
  WhisperX   word-level alignment for the karaoke captions. Also pre-downloads
             the NLTK 'punkt_tab' tokenizer that WhisperX 3.8+ needs at runtime
             — without it the first real transcription fails.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REMOTION_DIR = BASE_DIR / "remotion-video"

OK = "  [ok]  "
MISSING = "  [--]  "
FIXED = "  [+]   "
FAILED = "  [!!]  "


def run(cmd: list[str], cwd: Path | None = None, timeout: int = 3600) -> bool:
    print(f"        $ {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            timeout=timeout,
            shell=(sys.platform == "win32" and cmd[0] in {"npm", "npx"}),
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f"{FAILED}{exc}")
        return False


# ── ffmpeg ───────────────────────────────────────────────────────────────────
def check_ffmpeg(install: bool) -> bool:
    sys.path.insert(0, str(BASE_DIR))
    from media import ffmpeg_bin, ffprobe_bin  # local import: needs BASE_DIR on path

    path = ffmpeg_bin(required=False)
    if path:
        print(f"{OK}ffmpeg: {path}")
        probe = ffprobe_bin()
        print(f"{OK if probe else MISSING}ffprobe: {probe or 'not found (optional)'}")
        return True

    print(f"{MISSING}ffmpeg: not found")
    if not install:
        return False

    print("        Installing the imageio-ffmpeg fallback build...")
    if not run([sys.executable, "-m", "pip", "install", "imageio-ffmpeg"]):
        return False

    # Re-resolve with a fresh module so the lru_cache does not serve the miss.
    import importlib

    import media

    importlib.reload(media)
    path = media.ffmpeg_bin(required=False)
    if path:
        print(f"{FIXED}ffmpeg (bundled): {path}")
        print(
            "        NOTE: a system ffmpeg is faster. Install one with "
            "`winget install Gyan.FFmpeg` (Windows), `apt install ffmpeg` "
            "(Debian/Ubuntu) or `brew install ffmpeg` (macOS)."
        )
        return True

    print(f"{FAILED}ffmpeg still not resolvable")
    return False


# ── Remotion / node ──────────────────────────────────────────────────────────
def check_remotion(install: bool) -> bool:
    if shutil.which("npm") is None:
        print(f"{FAILED}npm not found — install Node.js 18+ from https://nodejs.org")
        return False

    node_modules = REMOTION_DIR / "node_modules"
    three = node_modules / "@remotion" / "three"
    captions = node_modules / "@remotion" / "captions"

    if three.exists() and captions.exists():
        print(f"{OK}Remotion deps installed (incl. three.js + captions)")
        return True

    if not node_modules.exists():
        print(f"{MISSING}remotion-video/node_modules: missing")
    else:
        print(f"{MISSING}three.js / captions packages: missing (package.json changed)")

    if not install:
        return False

    if not run(["npm", "install"], cwd=REMOTION_DIR):
        print(f"{FAILED}npm install failed")
        return False

    print(f"{FIXED}Remotion deps installed")
    return True


# ── WhisperX ─────────────────────────────────────────────────────────────────
def ensure_nltk_punkt() -> bool:
    """WhisperX 3.8+ tokenizes with NLTK punkt_tab; fetch it up front."""
    try:
        import nltk
    except ImportError:
        print(f"{MISSING}nltk not installed (comes with whisperx)")
        return False

    try:
        nltk.data.find("tokenizers/punkt_tab/english/")
        print(f"{OK}nltk punkt_tab present")
        return True
    except LookupError:
        pass

    print("        Downloading nltk punkt_tab...")
    if nltk.download("punkt_tab"):
        print(f"{FIXED}nltk punkt_tab downloaded")
        return True

    print(f"{FAILED}could not download punkt_tab — transcription will fail at runtime")
    return False


def check_whisper(install: bool) -> bool:
    sys.path.insert(0, str(BASE_DIR))
    import transcribe

    backend = transcribe.backend_available()
    if backend:
        print(f"{OK}transcription backend: {backend}")
        return ensure_nltk_punkt()

    print(f"{MISSING}whisperx: not installed (reels will render without captions)")
    if not install:
        return False

    print("        Installing whisperx — this pulls torch and takes a while.")
    if not run([sys.executable, "-m", "pip", "install", "whisperx"]):
        print(f"{FAILED}whisperx install failed")
        print(
            "        If the failure is a wheel build error for "
            "antlr4-python3-runtime, upgrade the build tools first:\n"
            "          python -m pip install --upgrade pip setuptools wheel"
        )
        return False

    import importlib

    importlib.reload(transcribe)
    backend = transcribe.backend_available()
    if not backend:
        print(f"{FAILED}whisperx installed but not importable")
        return False

    print(f"{FIXED}transcription backend: {backend}")
    return ensure_nltk_punkt()


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="report only, do not install")
    parser.add_argument("--skip-whisper", action="store_true", help="skip the whisperx install")
    args = parser.parse_args()

    install = not args.check
    print("\nBandLadder reel toolchain\n" + "=" * 48)

    results = {
        "ffmpeg": check_ffmpeg(install),
        "remotion + three.js": check_remotion(install),
    }
    if args.skip_whisper:
        print(f"{MISSING}whisperx: skipped (--skip-whisper)")
    else:
        results["whisperx"] = check_whisper(install)

    print("=" * 48)
    missing = [name for name, ok in results.items() if not ok]
    if missing:
        print(f"Incomplete: {', '.join(missing)}")
        # ffmpeg is the only hard requirement; the rest degrade gracefully.
        return 1 if not results["ffmpeg"] else 0

    print("All set — reels will render with captions and the 3D background.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
