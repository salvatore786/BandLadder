#!/usr/bin/env python3
"""
Create n8n workflow: Daily 9-type reel generation + staggered Instagram posting.

Schedule:
  06:00  → Generate all 9 question types (batch)
  07:00  → Post reel #1
  09:00  → Post reel #2
  11:00  → Post reel #3
  13:00  → Post reel #4
  15:00  → Post reel #5
  17:00  → Post reel #6
  19:00  → Post reel #7
  21:00  → Post reel #8
  23:00  → Post reel #9

Each posting trigger calls /post-next which picks the oldest unposted video.
"""

import json
import sys
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
OLD_WORKFLOW_ID = "4IyB4jEG6jppsEc3"  # Existing workflow to deactivate

HEADERS = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json",
}


def get_ngrok_url():
    """Get current ngrok URL from localhost API."""
    try:
        resp = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        tunnels = resp.json().get("tunnels", [])
        for t in tunnels:
            if t.get("proto") == "https":
                return t["public_url"]
        if tunnels:
            return tunnels[0]["public_url"]
    except Exception:
        pass
    return None


def build_workflow(ngrok_url: str) -> dict:
    """Build the n8n workflow JSON payload."""

    # Posting schedule: 9 posts spread from 7 AM to 11 PM (every 2 hours)
    post_hours = [7, 9, 11, 13, 15, 17, 19, 21, 23]

    nodes = [
        # ── GENERATION BRANCH ──────────────────────────────────────

        # 1. Daily trigger at 6:00 AM to generate all 9 types
        {
            "parameters": {
                "rule": {
                    "interval": [{"triggerAtHour": 6}]
                }
            },
            "id": "gen-trigger",
            "name": "Daily 6AM Generate",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [250, 300],
        },

        # 2. HTTP Request: Generate all 9 types
        {
            "parameters": {
                "method": "POST",
                "url": f"{ngrok_url}/generate-all-types",
                "sendBody": True,
                "bodyParameters": {"parameters": []},
                "options": {
                    "timeout": 5400000,  # 90 min (9 types x ~10 min each)
                    "allowUnauthorizedCerts": True,
                },
            },
            "id": "gen-all",
            "name": "Generate All 9 Types",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 300],
        },

        # 3. Generation result summary
        {
            "parameters": {
                "jsCode": (
                    "const data = $input.first().json;\n"
                    "return [{\n"
                    "  json: {\n"
                    "    status: data.success ? 'generated' : 'failed',\n"
                    "    total: data.total || 0,\n"
                    "    succeeded: data.succeeded || 0,\n"
                    "    failed: data.failed || 0,\n"
                    "    timestamp: new Date().toISOString(),\n"
                    "  }\n"
                    "}];"
                ),
            },
            "id": "gen-summary",
            "name": "Generation Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [750, 300],
        },

        # ── POSTING BRANCH ─────────────────────────────────────────

        # 4. Posting schedule trigger (9 times per day)
        {
            "parameters": {
                "rule": {
                    "interval": [
                        {"triggerAtHour": h} for h in post_hours
                    ]
                }
            },
            "id": "post-trigger",
            "name": "Post Schedule (9x/day)",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [250, 600],
        },

        # 5. HTTP Request: Post next unposted reel
        {
            "parameters": {
                "method": "POST",
                "url": f"{ngrok_url}/post-next",
                "options": {
                    "timeout": 300000,  # 5 min
                    "allowUnauthorizedCerts": True,
                },
            },
            "id": "post-next",
            "name": "Post Next Reel",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 600],
        },

        # 6. Check if posting succeeded
        {
            "parameters": {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict",
                    },
                    "conditions": [
                        {
                            "id": "post-check",
                            "leftValue": "={{ $json.success }}",
                            "rightValue": True,
                            "operator": {
                                "type": "boolean",
                                "operation": "equals",
                                "name": "filter.boolean.equals",
                            },
                        }
                    ],
                    "combinator": "and",
                },
                "options": {},
            },
            "id": "post-check",
            "name": "Posted OK?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [750, 600],
        },

        # 7. Post success summary
        {
            "parameters": {
                "jsCode": (
                    "const data = $input.first().json;\n"
                    "return [{\n"
                    "  json: {\n"
                    "    status: 'posted',\n"
                    "    video: data.video_file || 'unknown',\n"
                    "    timestamp: new Date().toISOString(),\n"
                    "  }\n"
                    "}];"
                ),
            },
            "id": "post-success",
            "name": "Post Success",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1000, 500],
        },

        # 8. Post failure summary
        {
            "parameters": {
                "jsCode": (
                    "const data = $('Post Next Reel').first().json;\n"
                    "return [{\n"
                    "  json: {\n"
                    "    status: 'post_failed',\n"
                    "    error: data.error || 'Unknown posting error',\n"
                    "    timestamp: new Date().toISOString(),\n"
                    "  }\n"
                    "}];"
                ),
            },
            "id": "post-fail",
            "name": "Post Failed",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1000, 750],
        },
    ]

    connections = {
        # Generation branch
        "Daily 6AM Generate": {
            "main": [[{"node": "Generate All 9 Types", "type": "main", "index": 0}]]
        },
        "Generate All 9 Types": {
            "main": [[{"node": "Generation Summary", "type": "main", "index": 0}]]
        },
        # Posting branch
        "Post Schedule (9x/day)": {
            "main": [[{"node": "Post Next Reel", "type": "main", "index": 0}]]
        },
        "Post Next Reel": {
            "main": [[{"node": "Posted OK?", "type": "main", "index": 0}]]
        },
        "Posted OK?": {
            "main": [
                [{"node": "Post Success", "type": "main", "index": 0}],
                [{"node": "Post Failed", "type": "main", "index": 0}],
            ]
        },
    }

    return {
        "name": "BandLadder Daily 9-Type Reel Pipeline",
        "nodes": nodes,
        "connections": connections,
        "settings": {
            "executionOrder": "v1",
            "saveManualExecutions": True,
            "callerPolicy": "workflowsFromSameOwner",
            "errorWorkflow": "",
        },
    }


def main():
    # 1. Get ngrok URL
    if len(sys.argv) > 1:
        ngrok_url = sys.argv[1].rstrip("/")
    else:
        print("Detecting ngrok URL...")
        ngrok_url = get_ngrok_url()
        if not ngrok_url:
            print("ERROR: ngrok not running. Pass URL as argument or start ngrok first.")
            sys.exit(1)

    print(f"ngrok URL: {ngrok_url}\n")

    # 2. Deactivate old workflow (if exists)
    print(f"Deactivating old workflow ({OLD_WORKFLOW_ID})...")
    try:
        deactivate_resp = requests.post(
            f"{N8N_BASE}/api/v1/workflows/{OLD_WORKFLOW_ID}/deactivate",
            headers=HEADERS,
        )
        if deactivate_resp.status_code == 200:
            print("  Old workflow deactivated.")
        else:
            print(f"  Could not deactivate (may not exist): {deactivate_resp.status_code}")
    except Exception as e:
        print(f"  Warning: {e}")

    # 3. Create new workflow
    workflow_payload = build_workflow(ngrok_url)
    print(f"\nCreating new workflow: '{workflow_payload['name']}'...")
    print(f"  Generation: daily at 6:00 AM (all 9 types)")
    print(f"  Posting: 9 times/day at 7,9,11,13,15,17,19,21,23 hours")

    resp = requests.post(
        f"{N8N_BASE}/api/v1/workflows",
        headers=HEADERS,
        json=workflow_payload,
    )

    if resp.status_code not in (200, 201):
        print(f"\nFAILED: {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)

    result = resp.json()
    workflow_id = result.get("id")
    print(f"\n  Workflow created! ID: {workflow_id}")
    print(f"  URL: {N8N_BASE}/workflow/{workflow_id}")

    # 4. Activate workflow
    print("\nActivating workflow...")
    activate_resp = requests.post(
        f"{N8N_BASE}/api/v1/workflows/{workflow_id}/activate",
        headers=HEADERS,
    )
    if activate_resp.status_code in (200, 201):
        print("  Workflow ACTIVATED!")
    else:
        print(f"  WARNING: Activation status {activate_resp.status_code}")
        print(f"  Activate manually: {N8N_BASE}/workflow/{workflow_id}")

    # 5. Update the workflow ID in update_n8n_url.py for future ngrok URL syncs
    print(f"\n  IMPORTANT: Update WORKFLOW_ID in update_n8n_url.py to: {workflow_id}")
    print(f"  Or run: python update_n8n_url.py  (after updating the ID)")

    print(f"\n{'='*60}")
    print(f"  DAILY PIPELINE ACTIVE")
    print(f"  9 question types generated at 6 AM")
    print(f"  9 reels posted every 2 hours (7 AM to 11 PM)")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
