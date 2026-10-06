#!/usr/bin/env python3
"""
Frame-to-frame motion measurement for a reel.

Short-form reach tracks how continuously the frame is changing, not how many
effects are in it, so this reduces a video to five numbers that a render can be
compared against a reference reel on.

Method, fixed so that two runs are always comparable:

  * first 35 seconds only, decoded to 180x320 grayscale
  * a pixel "moved" when its luma changed by more than 4/255 since the frame before
  * the frame is split into a 3x5 grid, and each tile is judged on its own --
    a chip popping in at the bottom is a motion event even while the title is
    still, which is exactly the "something is always moving" property being
    measured
  * a motion event is a run of >=2 consecutive frames in which one tile is
    above the threshold

Absolute values depend on these constants, so always read a render against the
reference measured by the same run rather than against a remembered number.

Usage:  measure_motion.py VIDEO [VIDEO ...]
"""
import json
import subprocess
import sys

import numpy as np

W, H = 180, 320          # analysis resolution
GRID_X, GRID_Y = 3, 5    # tiles across and down
SECONDS = 35             # window measured
PIXEL_DELTA = 4          # luma change (of 255) that counts as a moved pixel
TILE_MOVE = 0.02         # share of a tile that must move for it to be "in motion"
FRAME_VISIBLE = 0.01     # whole-frame share above which a viewer sees a change
SUSTAINED_FRAMES = 10    # 333ms at 30fps
MIN_RUN = 2


def moved_mask(path: str) -> tuple[np.ndarray, float]:
    """Per-frame boolean map of which pixels moved, plus the video's fps."""
    rate = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=r_frame_rate", "-of", "csv=p=0:nk=1", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip().strip(",")
    num, _, den = rate.partition("/")
    fps = float(num) / float(den or 1)

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-t", str(SECONDS),
         "-vf", f"scale={W}:{H}", "-pix_fmt", "gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True,
    ).stdout
    n = len(raw) // (W * H)
    frames = np.frombuffer(raw[: n * W * H], dtype=np.uint8).reshape(n, H, W).astype(np.int16)
    return np.abs(np.diff(frames, axis=0)) > PIXEL_DELTA, fps


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Maximal runs of True as (start, length), runs under MIN_RUN dropped."""
    out: list[tuple[int, int]] = []
    start = None
    for i, on in enumerate(mask):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if i - start >= MIN_RUN:
                out.append((start, i - start))
            start = None
    if start is not None and len(mask) - start >= MIN_RUN:
        out.append((start, len(mask) - start))
    return out


def is_eased(profile: np.ndarray) -> bool:
    """
    True when a run accelerates and decelerates instead of cutting.

    A hard cut or a linear slide peaks on its first or last frame and holds a
    flat intensity; a spring peaks in the middle and tails off.
    """
    if len(profile) < 3:
        return False
    peak = int(np.argmax(profile))
    if not 0 < peak < len(profile) - 1:
        return False
    return float(profile.std()) / max(float(profile.mean()), 1e-9) > 0.18


def measure(path: str) -> dict:
    moved, fps = moved_mask(path)
    n = len(moved)

    th, tw = H // GRID_Y, W // GRID_X
    tiles = (
        moved[:, : th * GRID_Y, : tw * GRID_X]
        .reshape(n, GRID_Y, th, GRID_X, tw)
        .mean(axis=(2, 4))
    )
    whole = moved.mean(axis=(1, 2))

    lengths: list[int] = []
    sustained_cells = 0
    for gy in range(GRID_Y):
        for gx in range(GRID_X):
            series = tiles[:, gy, gx]
            for start, length in runs(series >= TILE_MOVE):
                lengths.append(length)
                if length >= SUSTAINED_FRAMES and is_eased(series[start: start + length]):
                    sustained_cells += length

    cells = n * GRID_X * GRID_Y
    return {
        "file": path.split("/")[-1],
        "window_s": round(n / fps, 1),
        "motion_events": len(lengths),
        "avg_event_ms": round(1000 * float(np.mean(lengths)) / fps) if lengths else 0,
        "sustained_eased_pct": round(100 * sustained_cells / cells, 1),
        "amplitude_p95": round(float(np.percentile(tiles.max(axis=(1, 2)), 95)), 2),
        "static_pct": round(100 * float((whole < FRAME_VISIBLE).mean()), 1),
    }


if __name__ == "__main__":
    rows = [measure(p) for p in sys.argv[1:]]
    hdr = (f"{'file':<36}{'secs':>6}{'events':>8}{'avg ms':>8}"
           f"{'eased%':>8}{'p95':>7}{'static%':>9}")
    print(hdr)
    print("-" * len(hdr))
    for r in rows:
        print(f"{r['file'][:35]:<36}{r['window_s']:>6}{r['motion_events']:>8}"
              f"{r['avg_event_ms']:>8}{r['sustained_eased_pct']:>8}"
              f"{r['amplitude_p95']:>7}{r['static_pct']:>9}")
    print()
    print(json.dumps(rows, indent=2))
