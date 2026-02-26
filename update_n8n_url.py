#!/usr/bin/env python3
"""
Update the ngrok URL in the n8n workflow automatically.
Run this after restarting ngrok to sync the new URL.

Usage: python update_n8n_url.py
  (auto-detects ngrok URL from localhost:4040 API)

Or: python update_n8n_url.py https://your-new-ngrok-url.ngrok-free.dev
"""

import json
import sys
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
WORKFLOW_ID = "4IyB4jEG6jppsEc3"

HEADERS = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json",
}


def get_ngrok_url():
    """Get the current ngrok public URL from localhost API."""
    try:
        resp = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        tunnels = resp.json().get("tunnels", [])
        for t in tunnels:
            if t.get("proto") == "https":
                return t["public_url"]
        if tunnels:
            return tunnels[0]["public_url"]
    except Exception as e:
        print(f"Could not reach ngrok API: {e}")
    return None


def update_workflow(new_url):
    """Fetch the workflow, update URLs, and save back."""
    # Get current workflow
    resp = requests.get(f"{N8N_BASE}/api/v1/workflows/{WORKFLOW_ID}", headers=HEADERS)
    if resp.status_code != 200:
        print(f"Failed to get workflow: {resp.status_code}")
        return False

    workflow = resp.json()

    # Update URLs in HTTP Request nodes
    updated = 0
    for node in workflow.get("nodes", []):
        if node.get("type") == "n8n-nodes-base.httpRequest":
            url = node.get("parameters", {}).get("url", "")
            if "ngrok" in url or "localhost" in url:
                # Extract the path part
                path = "/" + url.split("/", 3)[-1] if url.count("/") >= 3 else ""
                for known_path in ["/generate-all-types", "/generate", "/post-next", "/generate-and-post", "/status", "/queue"]:
                    if known_path in url:
                        path = known_path
                        break
                node["parameters"]["url"] = f"{new_url}{path}"
                print(f"  Updated '{node['name']}': {new_url}{path}")
                updated += 1

    if updated == 0:
        print("No HTTP Request nodes with ngrok URLs found.")
        return False

    # Save back — only send fields the n8n API accepts
    update_payload = {
        "name": workflow.get("name", ""),
        "nodes": workflow.get("nodes", []),
        "connections": workflow.get("connections", {}),
        "settings": workflow.get("settings", {}),
    }
    put_resp = requests.put(
        f"{N8N_BASE}/api/v1/workflows/{WORKFLOW_ID}",
        headers=HEADERS,
        json=update_payload,
    )
    if put_resp.status_code == 200:
        print(f"\nSUCCESS: Updated {updated} node(s) with new URL: {new_url}")
        return True
    else:
        print(f"Failed to save workflow: {put_resp.status_code} - {put_resp.text[:300]}")
        return False


def main():
    if len(sys.argv) > 1:
        new_url = sys.argv[1].rstrip("/")
    else:
        print("Detecting ngrok URL from localhost:4040...")
        new_url = get_ngrok_url()
        if not new_url:
            print("ERROR: ngrok not running or no tunnel found.")
            print("Usage: python update_n8n_url.py <new_ngrok_url>")
            sys.exit(1)

    print(f"New ngrok URL: {new_url}")
    print(f"Updating workflow {WORKFLOW_ID}...\n")
    success = update_workflow(new_url)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
