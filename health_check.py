#!/usr/bin/env python3
"""
BandLadder Health Check — Verifies daily pipeline ran successfully.

Checks:
  1. Today's videos exist in output/ folder
  2. Today's videos were uploaded to Google Drive (in upload_log.json)
  3. n8n poster workflow is active and has correct node count
  4. Google Drive folder has files ready to post

Run after daily pipeline, or anytime to check system health.
Exit code 0 = all good, 1 = issues found.
"""

import json
import sys
import warnings
from datetime import datetime
from pathlib import Path

import requests

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"
UPLOAD_LOG = BASE_DIR / "content" / "upload_log.json"
CONTENT_PLAN = BASE_DIR / "content" / "content_plan.json"

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
POSTER_WF_ID = "lj2ZXWIvNDZmti3y"
WEBHOOK_WF_ID = "2rv3ZU1O6x6NclTt"
EXPECTED_NODES = 20

issues = []
warnings_list = []


def check_todays_videos():
    """Check if today's videos exist locally."""
    today = datetime.now().strftime("%Y%m%d")
    videos = sorted(OUTPUT_DIR.glob(f"*_{today}.mp4")) if OUTPUT_DIR.exists() else []
    videos = [v for v in videos if not v.name.startswith(("cta_", "hook_", "full_reel", "test_"))]

    if len(videos) == 0:
        issues.append(f"NO videos generated today ({today})")
    elif len(videos) < 9:
        warnings_list.append(f"Only {len(videos)}/9 videos generated today")
    else:
        print(f"  [OK] {len(videos)} videos generated today")

    # Check thumbnails
    thumbs = sorted((BASE_DIR / "content" / "thumbnails").glob(f"*_{today}_thumb.jpg"))
    if len(thumbs) < len(videos):
        warnings_list.append(f"Only {len(thumbs)}/{len(videos)} thumbnails generated")
    elif len(videos) > 0:
        print(f"  [OK] {len(thumbs)} thumbnails generated")


def check_uploads():
    """Check if today's videos were uploaded to Drive."""
    today = datetime.now().strftime("%Y%m%d")

    if not UPLOAD_LOG.exists():
        issues.append("upload_log.json not found")
        return

    with open(UPLOAD_LOG, "r", encoding="utf-8") as f:
        log_data = json.load(f)

    today_uploads = [e for e in log_data if today in e.get("video_file", "")]
    if len(today_uploads) == 0:
        issues.append(f"NO uploads to Drive today ({today})")
    elif len(today_uploads) < 9:
        warnings_list.append(f"Only {len(today_uploads)}/9 uploaded to Drive")
    else:
        print(f"  [OK] {len(today_uploads)} videos uploaded to Drive")


def check_content_plan():
    """Check remaining content plan entries."""
    if not CONTENT_PLAN.exists():
        issues.append("content_plan.json not found")
        return

    with open(CONTENT_PLAN, "r", encoding="utf-8") as f:
        plan = json.load(f)

    unused = sum(1 for e in plan if not e["used"])
    if unused == 0:
        issues.append("Content plan EMPTY — no entries left for tomorrow!")
    elif unused < 9:
        warnings_list.append(f"Only {unused} entries left in content plan (less than 1 day)")
    elif unused < 18:
        warnings_list.append(f"{unused} entries left in content plan (less than 2 days)")
    else:
        days_left = unused // 9
        print(f"  [OK] {unused} content plan entries ({days_left} days remaining)")


def check_n8n_workflows():
    """Check n8n workflows are active and properly configured."""
    headers = {"X-N8N-API-KEY": N8N_API_KEY}

    try:
        # Check poster workflow
        r = requests.get(
            f"{N8N_BASE}/api/v1/workflows/{POSTER_WF_ID}",
            headers=headers, verify=False, timeout=15
        )
        if r.status_code != 200:
            issues.append(f"Cannot reach n8n poster workflow (HTTP {r.status_code})")
            return

        wf = r.json()
        if not wf.get("active"):
            issues.append("Poster workflow is INACTIVE!")
        else:
            print(f"  [OK] Poster workflow active")

        node_count = len(wf.get("nodes", []))
        if node_count != EXPECTED_NODES:
            issues.append(f"Poster workflow has {node_count} nodes (expected {EXPECTED_NODES})")
        else:
            print(f"  [OK] Poster workflow has {node_count} nodes")

        # Check webhook workflow
        r2 = requests.get(
            f"{N8N_BASE}/api/v1/workflows/{WEBHOOK_WF_ID}",
            headers=headers, verify=False, timeout=15
        )
        if r2.status_code == 200:
            wf2 = r2.json()
            if not wf2.get("active"):
                issues.append("Upload webhook workflow is INACTIVE!")
            else:
                print(f"  [OK] Upload webhook active")

        # Check recent executions for errors
        r3 = requests.get(
            f"{N8N_BASE}/api/v1/executions?workflowId={POSTER_WF_ID}&limit=5",
            headers=headers, verify=False, timeout=15
        )
        if r3.status_code == 200:
            execs = r3.json().get("data", [])
            recent_errors = sum(1 for e in execs if e.get("status") == "error")
            recent_success = sum(1 for e in execs if e.get("status") == "success")
            if recent_errors > 0 and recent_success == 0:
                issues.append(f"Last {len(execs)} n8n executions ALL failed!")
            elif recent_errors > 0:
                warnings_list.append(f"{recent_errors}/{len(execs)} recent n8n executions had errors")
            else:
                print(f"  [OK] Recent n8n executions healthy ({recent_success} success)")

    except requests.exceptions.ConnectionError:
        issues.append("Cannot connect to n8n server!")
    except Exception as e:
        issues.append(f"n8n check error: {str(e)[:100]}")


def main():
    print("=" * 50)
    print(f"  BandLadder Health Check")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    check_todays_videos()
    check_uploads()
    check_content_plan()
    check_n8n_workflows()

    print()

    if issues:
        print(f"ISSUES ({len(issues)}):")
        for i in issues:
            print(f"  [FAIL] {i}")

    if warnings_list:
        print(f"WARNINGS ({len(warnings_list)}):")
        for w in warnings_list:
            print(f"  [WARN] {w}")

    if not issues and not warnings_list:
        print("ALL CHECKS PASSED")

    print()

    # Exit code: 1 if any issues, 0 if only warnings or clean
    if issues:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
