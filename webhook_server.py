#!/usr/bin/env python3
"""
Webhook Server for n8n — IELTS/PTE Reel Generator Pipeline
Exposes HTTP endpoints that n8n can call to trigger reel generation and Instagram posting.

Endpoints:
  POST /generate          — Generate 1 reel (random type from content plan)
  POST /generate-and-post — Generate 1 reel + immediately post to Instagram
  POST /post-next         — Post the next unposted reel to Instagram
  GET  /status            — Health check + stats (unposted count, last post, etc.)
  GET  /queue             — List unposted videos ready for posting

Start: python webhook_server.py
Default port: 5111
"""

import json
import logging
import os
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

# ── Paths ──
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
CAPTIONS_DIR = BASE_DIR / "content" / "captions"
POST_LOG = BASE_DIR / "content" / "post_log.json"
WEBHOOK_LOG = BASE_DIR / "webhook_server.log"

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(WEBHOOK_LOG), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Track running tasks to prevent overlaps
_running_task = {"active": False, "task": None, "started_at": None}
_task_lock = threading.Lock()


def load_post_log():
    if POST_LOG.exists():
        with open(POST_LOG, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def get_unposted_videos():
    if not OUTPUT_DIR.exists():
        return []
    post_log = load_post_log()
    posted_files = {entry["video_file"] for entry in post_log if entry.get("status") == "success"}
    unposted = []
    for f in sorted(OUTPUT_DIR.glob("*.mp4")):
        if f.name not in posted_files and f.name != "test_remotion.mp4":
            unposted.append(f)
    return unposted


def run_generate_reel(question_type=None):
    """Run generate_reel.py and return the result."""
    cmd = [sys.executable, str(BASE_DIR / "generate_reel.py")]
    if question_type:
        cmd += ["--type", question_type]

    env = os.environ.copy()
    env["CEREBRAS_API_KEY"] = env.get("CEREBRAS_API_KEY", "")
    env["GROQ_API_KEY"] = env.get("GROQ_API_KEY", "")

    logger.info(f"Starting reel generation: {' '.join(cmd)}")
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(BASE_DIR),
        env=env,
        timeout=600,  # 10 min timeout
    )

    if result.returncode != 0:
        error_msg = result.stderr[-500:] if result.stderr else ""
        stdout_msg = result.stdout[-500:] if result.stdout else ""
        logger.error(f"Generation failed (rc={result.returncode}): stderr={error_msg} stdout={stdout_msg}")
        return {"success": False, "error": error_msg or stdout_msg or "Unknown error"}

    # Parse output to find video path
    output = result.stdout
    video_path = None
    for line in output.split("\n"):
        if "DONE! Output:" in line:
            video_path = line.split("DONE! Output:")[-1].strip()
            break

    # Load matching caption
    caption = None
    caption_file = None
    if video_path:
        vp = Path(video_path)
        cf = CAPTIONS_DIR / f"{vp.stem}_caption.txt"
        if cf.exists():
            caption = cf.read_text(encoding="utf-8")
            caption_file = cf.name
            logger.info(f"Caption loaded: {caption_file}")
        else:
            logger.warning(f"No caption file found at {cf}")

    logger.info(f"Generation complete: {video_path}")
    return {
        "success": True,
        "video_path": video_path,
        "video_file": Path(video_path).name if video_path else None,
        "caption": caption,
        "caption_file": caption_file,
        "output": output[-1000:],
    }


def run_post_to_instagram(video_path=None):
    """Post a reel to Instagram. If no path given, posts the next unposted one."""
    if not video_path:
        unposted = get_unposted_videos()
        if not unposted:
            return {"success": False, "error": "No unposted videos found"}
        video_path = str(unposted[0])

    video_file = Path(video_path)
    if not video_file.exists():
        return {"success": False, "error": f"Video not found: {video_path}"}

    cmd = [sys.executable, str(BASE_DIR / "post_to_instagram.py"), "--video", str(video_file)]

    env = os.environ.copy()
    # Instagram credentials — hardcoded fallback if env vars not set
    env.setdefault("INSTAGRAM_USERNAME", "bandladder_")
    env.setdefault("INSTAGRAM_PASSWORD", "#BandLadder786")
    if not env.get("INSTAGRAM_USERNAME") or not env.get("INSTAGRAM_PASSWORD"):
        return {"success": False, "error": "INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD not configured"}

    logger.info(f"Posting to Instagram: {video_file.name}")
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(BASE_DIR),
        env=env,
        timeout=300,  # 5 min timeout
    )

    if result.returncode != 0:
        logger.error(f"Posting failed: {result.stderr}")
        return {"success": False, "error": result.stderr[-500:] if result.stderr else "Unknown error"}

    logger.info(f"Posted successfully: {video_file.name}")
    return {
        "success": True,
        "video_file": video_file.name,
        "output": result.stdout[-500:],
    }


def run_task_async(task_name, func, **kwargs):
    """Run a task in a background thread, preventing overlaps."""
    with _task_lock:
        if _running_task["active"]:
            return {
                "success": False,
                "error": f"Another task is already running: {_running_task['task']} (started {_running_task['started_at']})",
            }, 409

        _running_task["active"] = True
        _running_task["task"] = task_name
        _running_task["started_at"] = datetime.now().isoformat()

    def wrapper():
        try:
            func(**kwargs)
        finally:
            with _task_lock:
                _running_task["active"] = False
                _running_task["task"] = None
                _running_task["started_at"] = None

    thread = threading.Thread(target=wrapper, daemon=True)
    thread.start()
    return {"success": True, "message": f"Task '{task_name}' started", "started_at": _running_task["started_at"]}, 202


# ── Endpoints ──

@app.route("/status", methods=["GET"])
def status():
    """Health check + pipeline stats."""
    unposted = get_unposted_videos()
    post_log = load_post_log()
    last_post = post_log[-1] if post_log else None

    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "unposted_count": len(unposted),
        "total_posted": len([p for p in post_log if p.get("status") == "success"]),
        "last_post": last_post,
        "task_running": _running_task["active"],
        "current_task": _running_task["task"],
    })


@app.route("/queue", methods=["GET"])
def queue():
    """List unposted videos."""
    unposted = get_unposted_videos()
    return jsonify({
        "count": len(unposted),
        "videos": [{"name": v.name, "size_mb": round(v.stat().st_size / 1024 / 1024, 2)} for v in unposted],
    })


@app.route("/generate", methods=["POST"])
def generate():
    """Generate 1 reel. Optional body: {"type": "sentence_completion"}"""
    data = request.get_json(silent=True) or {}
    question_type = data.get("type")

    with _task_lock:
        if _running_task["active"]:
            return jsonify({
                "success": False,
                "error": f"Task already running: {_running_task['task']}",
            }), 409

    # Run synchronously (n8n will wait for the response)
    with _task_lock:
        _running_task["active"] = True
        _running_task["task"] = "generate"
        _running_task["started_at"] = datetime.now().isoformat()

    try:
        result = run_generate_reel(question_type)
        return jsonify(result), 200 if result["success"] else 500
    finally:
        with _task_lock:
            _running_task["active"] = False
            _running_task["task"] = None
            _running_task["started_at"] = None


@app.route("/post-next", methods=["POST"])
def post_next():
    """Post the next unposted reel to Instagram."""
    with _task_lock:
        if _running_task["active"]:
            return jsonify({
                "success": False,
                "error": f"Task already running: {_running_task['task']}",
            }), 409

    with _task_lock:
        _running_task["active"] = True
        _running_task["task"] = "post"
        _running_task["started_at"] = datetime.now().isoformat()

    try:
        result = run_post_to_instagram()
        return jsonify(result), 200 if result["success"] else 500
    finally:
        with _task_lock:
            _running_task["active"] = False
            _running_task["task"] = None
            _running_task["started_at"] = None


@app.route("/generate-all-types", methods=["POST"])
def generate_all_types():
    """Generate 1 reel for EACH registered question type (all 9 types).
    Returns a list of results. Used by n8n for daily batch generation.
    Optional body: {"types": ["form_completion", "mcq_single"]} to specify a subset.
    """
    data = request.get_json(silent=True) or {}

    with _task_lock:
        if _running_task["active"]:
            return jsonify({
                "success": False,
                "error": f"Task already running: {_running_task['task']}",
            }), 409

    # Import the registry to know all available types
    from generate_reel import GENERATOR_REGISTRY, load_plan, get_next_unused

    # Use custom type list or all registered types
    requested_types = data.get("types") or list(GENERATOR_REGISTRY.keys())
    plan = load_plan()

    # Filter to types that have unused entries
    types_to_generate = []
    for qtype in requested_types:
        if qtype in GENERATOR_REGISTRY and get_next_unused(plan, qtype):
            types_to_generate.append(qtype)

    if not types_to_generate:
        return jsonify({
            "success": False,
            "error": "No unused content plan entries for any requested type",
        }), 404

    with _task_lock:
        _running_task["active"] = True
        _running_task["task"] = f"generate-all-types ({len(types_to_generate)} types)"
        _running_task["started_at"] = datetime.now().isoformat()

    try:
        logger.info(f"=== BATCH GENERATION: {len(types_to_generate)} types ===")
        results = []
        for qtype in types_to_generate:
            logger.info(f"  Generating: {qtype}")
            try:
                result = run_generate_reel(question_type=qtype)
                results.append({
                    "type": qtype,
                    "success": result["success"],
                    "video_file": result.get("video_file"),
                    "error": result.get("error"),
                })
            except Exception as e:
                logger.error(f"  Failed {qtype}: {e}")
                results.append({
                    "type": qtype,
                    "success": False,
                    "error": str(e),
                })

        succeeded = sum(1 for r in results if r["success"])
        logger.info(f"=== BATCH COMPLETE: {succeeded}/{len(results)} succeeded ===")

        return jsonify({
            "success": succeeded > 0,
            "total": len(results),
            "succeeded": succeeded,
            "failed": len(results) - succeeded,
            "results": results,
        })

    finally:
        with _task_lock:
            _running_task["active"] = False
            _running_task["task"] = None
            _running_task["started_at"] = None


@app.route("/generate-and-post", methods=["POST"])
def generate_and_post():
    """Generate 1 reel + post it to Instagram. This is the main endpoint n8n calls."""
    data = request.get_json(silent=True) or {}
    question_type = data.get("type")

    with _task_lock:
        if _running_task["active"]:
            return jsonify({
                "success": False,
                "error": f"Task already running: {_running_task['task']}",
            }), 409

    with _task_lock:
        _running_task["active"] = True
        _running_task["task"] = "generate-and-post"
        _running_task["started_at"] = datetime.now().isoformat()

    try:
        # Step 1: Generate
        logger.info("=== GENERATE & POST PIPELINE START ===")
        gen_result = run_generate_reel(question_type)
        if not gen_result["success"]:
            return jsonify({"success": False, "step": "generate", "error": gen_result["error"]}), 500

        # Step 2: Post
        video_path = gen_result.get("video_path")
        if not video_path:
            return jsonify({"success": False, "step": "post", "error": "No video path from generation"}), 500

        post_result = run_post_to_instagram(video_path)
        if not post_result["success"]:
            return jsonify({
                "success": False,
                "step": "post",
                "video_generated": gen_result["video_file"],
                "error": post_result["error"],
            }), 500

        logger.info("=== GENERATE & POST PIPELINE COMPLETE ===")
        return jsonify({
            "success": True,
            "video_file": gen_result["video_file"],
            "posted": True,
        })

    finally:
        with _task_lock:
            _running_task["active"] = False
            _running_task["task"] = None
            _running_task["started_at"] = None


@app.route("/get-next-reel", methods=["POST"])
def get_next_reel():
    """Return the next unposted reel's video URL + caption for n8n to post via Graph API.
    Does NOT post — just provides the info. n8n calls /mark-posted after successful posting.
    """
    unposted = get_unposted_videos()
    if not unposted:
        return jsonify({"success": False, "error": "No unposted videos found"}), 404

    video_file = unposted[0]

    # Find matching caption
    caption_file = CAPTIONS_DIR / f"{video_file.stem}_caption.txt"
    if caption_file.exists():
        caption = caption_file.read_text(encoding="utf-8")
    else:
        caption = (
            "\U0001f3a7 Practice your listening skills! Follow @bandladder for daily practice! \U0001f4aa\n\n"
            "#IELTS #BandLadder #IELTSPreparation"
        )

    # Build video URL using the ngrok tunnel base or request host
    # n8n will use this URL to tell Instagram Graph API where to fetch the video
    host = request.headers.get("X-Forwarded-Host") or request.headers.get("Host", "localhost:5111")
    scheme = request.headers.get("X-Forwarded-Proto", "https")
    video_url = f"{scheme}://{host}/videos/{video_file.name}"

    logger.info(f"Serving next reel info: {video_file.name} (URL: {video_url})")
    return jsonify({
        "success": True,
        "video_file": video_file.name,
        "video_url": video_url,
        "caption": caption,
        "unposted_remaining": len(unposted) - 1,
    })


@app.route("/mark-posted", methods=["POST"])
def mark_posted():
    """Mark a video as successfully posted (called by n8n after Graph API posting succeeds)."""
    data = request.get_json(silent=True) or {}
    video_file = data.get("video_file")
    media_id = data.get("media_id", "")

    if not video_file:
        return jsonify({"success": False, "error": "video_file is required"}), 400

    log = load_post_log()
    log.append({
        "video_file": video_file,
        "media_id": media_id,
        "caption": data.get("caption", "")[:200],
        "posted_at": datetime.now().isoformat(),
        "status": "success",
        "method": "graph_api",
    })
    save_post_log(log)

    logger.info(f"Marked as posted (Graph API): {video_file} (media_id: {media_id})")
    return jsonify({"success": True, "video_file": video_file})


def save_post_log(log):
    POST_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(POST_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


@app.route("/videos/<filename>", methods=["GET"])
def serve_video(filename):
    """Serve a video file from the output directory. Used by Graph API to fetch the video."""
    return send_from_directory(str(OUTPUT_DIR), filename, mimetype="video/mp4")


if __name__ == "__main__":
    port = int(os.environ.get("WEBHOOK_PORT", 5111))
    logger.info(f"Starting webhook server on port {port}")
    logger.info(f"Base dir: {BASE_DIR}")
    logger.info(f"Output dir: {OUTPUT_DIR}")
    logger.info("Endpoints: /status, /queue, /generate, /generate-all-types, /post-next, /get-next-reel, /mark-posted, /videos/<file>, /generate-and-post")
    app.run(host="0.0.0.0", port=port, debug=False)
