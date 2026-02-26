#!/usr/bin/env python3
"""Update the Google Drive folder ID in both n8n workflows."""

import json
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"

NEW_FOLDER = "1pO0qBAwlPQLFzDOCZsAYzMttsgJigB64"
OLD_FOLDER = "1XgNriZ7OfCXixt6vBA0SSgo_t1O6bGOu"

headers = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Content-Type": "application/json",
}

ALLOWED_FIELDS = ["name", "nodes", "connections", "settings", "staticData", "pinData"]

def update_workflow(wf_id, label):
    print(f"Updating {label} ({wf_id})...")
    resp = requests.get(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=headers, verify=False, timeout=30)
    wf = resp.json()

    # Replace folder ID in nodes
    raw = json.dumps(wf["nodes"])
    raw = raw.replace(OLD_FOLDER, NEW_FOLDER)
    nodes = json.loads(raw)

    # Only send allowed fields
    payload = {k: wf[k] for k in ALLOWED_FIELDS if k in wf}
    payload["nodes"] = nodes

    resp = requests.put(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=headers, json=payload, verify=False, timeout=30)
    if resp.status_code == 200:
        print(f"  OK - updated to folder: {NEW_FOLDER}")
    else:
        print(f"  FAILED: {resp.status_code} {resp.text[:300]}")

update_workflow("lj2ZXWIvNDZmti3y", "Reel Poster")
update_workflow("2rv3ZU1O6x6NclTt", "Upload Webhook")
print("\nDone!")
