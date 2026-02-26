#!/usr/bin/env python3
"""Deploy n8n webhook that accepts video uploads and puts them in Google Drive 'listening' folder."""

import json
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
HEADERS = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}

GDRIVE_CRED_ID = "f2CGoaFye8PSrXzj"
GDRIVE_CRED_NAME = "Google Drive account"
LISTENING_FOLDER_ID = "1Z-MjOx8fhW9fklinOyM3eR7gLPeUu0no"

workflow = {
    "name": "BandLadder Reel Uploader (Webhook)",
    "nodes": [
        # 1. Webhook - accepts POST with binary file
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "upload-reel",
                "responseMode": "lastNode",
                "options": {
                    "rawBody": True
                },
            },
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "position": [0, 300],
            "id": "up111111-1111-1111-1111-111111111111",
            "name": "Upload Webhook",
            "webhookId": "upload-reel-webhook",
        },
        # 2. Upload to Google Drive listening folder
        {
            "parameters": {
                "operation": "upload",
                "name": "={{ $json.headers['x-filename'] || 'reel.mp4' }}",
                "folderId": {
                    "__rl": True,
                    "value": LISTENING_FOLDER_ID,
                    "mode": "id",
                },
                "options": {
                    "description": "={{ $json.headers['x-caption'] || '' }}",
                },
            },
            "type": "n8n-nodes-base.googleDrive",
            "typeVersion": 3,
            "position": [280, 300],
            "id": "up222222-2222-2222-2222-222222222222",
            "name": "Upload to Drive",
            "credentials": {
                "googleDriveOAuth2Api": {
                    "id": GDRIVE_CRED_ID,
                    "name": GDRIVE_CRED_NAME,
                }
            },
        },
    ],
    "connections": {
        "Upload Webhook": {
            "main": [[{"node": "Upload to Drive", "type": "main", "index": 0}]]
        },
    },
    "settings": {"executionOrder": "v1"},
}

resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=HEADERS, json=workflow)
print(f"Create: {resp.status_code}")
result = resp.json()
wf_id = result.get("id", "FAILED")

if resp.status_code == 200:
    print(f"Workflow ID: {wf_id}")
    print(f"URL: {N8N_BASE}/workflow/{wf_id}")

    # Activate
    resp2 = requests.post(
        f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=HEADERS
    )
    print(f"Activated: {resp2.json().get('active')}")
    print(f"\nWebhook URL: {N8N_BASE}/webhook/upload-reel")
    print("Upload with: curl -X POST -H 'x-filename: reel.mp4' -H 'x-caption: ...' --data-binary @file.mp4 URL")
else:
    print(f"Error: {resp.text[:500]}")
