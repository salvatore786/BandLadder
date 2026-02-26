#!/usr/bin/env python3
"""Create the IELTS/PTE Reel Generator n8n workflow via API."""

import json
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"

HEADERS = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json",
}

# The ngrok URL for the webhook server
NGROK_URL = "https://unsubsiding-unmelancholically-corie.ngrok-free.dev"

workflow_payload = {
    "name": "BandLadder IELTS/PTE Reel Generator + Instagram Poster",
    "nodes": [
        {
            "parameters": {
                "rule": {
                    "interval": [
                        {"triggerAtHour": 6},
                        {"triggerAtHour": 12},
                        {"triggerAtHour": 18},
                        {"triggerAtHour": 0},
                    ]
                }
            },
            "id": "schedule-trigger",
            "name": "Every 6 Hours",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [250, 300],
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{NGROK_URL}/generate",
                "sendBody": True,
                "bodyParameters": {
                    "parameters": []
                },
                "options": {
                    "timeout": 600000,
                    "allowUnauthorizedCerts": True,
                },
            },
            "id": "generate-reel",
            "name": "Generate Reel",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [500, 300],
        },
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
                            "id": "condition-1",
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
            "id": "check-generation",
            "name": "Generation OK?",
            "type": "n8n-nodes-base.if",
            "typeVersion": 2.2,
            "position": [750, 300],
        },
        {
            "parameters": {
                "method": "POST",
                "url": f"{NGROK_URL}/post-next",
                "options": {
                    "timeout": 300000,
                    "allowUnauthorizedCerts": True,
                },
            },
            "id": "post-instagram",
            "name": "Post to Instagram",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1000, 200],
        },
        {
            "parameters": {
                "jsCode": (
                    "const input = $input.first().json;\n"
                    "const genResult = $('Generate Reel').first().json;\n"
                    "return [{\n"
                    "  json: {\n"
                    "    status: 'success',\n"
                    "    video: genResult.video_file || 'unknown',\n"
                    "    posted: input.success || false,\n"
                    "    timestamp: new Date().toISOString(),\n"
                    "  }\n"
                    "}];"
                ),
            },
            "id": "summary-success",
            "name": "Success Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1250, 200],
        },
        {
            "parameters": {
                "jsCode": (
                    "const genResult = $('Generate Reel').first().json;\n"
                    "return [{\n"
                    "  json: {\n"
                    "    status: 'failed',\n"
                    "    error: genResult.error || 'Generation failed',\n"
                    "    timestamp: new Date().toISOString(),\n"
                    "  }\n"
                    "}];"
                ),
            },
            "id": "summary-fail",
            "name": "Error Summary",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [1000, 450],
        },
    ],
    "connections": {
        "Every 6 Hours": {
            "main": [
                [{"node": "Generate Reel", "type": "main", "index": 0}]
            ]
        },
        "Generate Reel": {
            "main": [
                [{"node": "Generation OK?", "type": "main", "index": 0}]
            ]
        },
        "Generation OK?": {
            "main": [
                [{"node": "Post to Instagram", "type": "main", "index": 0}],
                [{"node": "Error Summary", "type": "main", "index": 0}],
            ]
        },
        "Post to Instagram": {
            "main": [
                [{"node": "Success Summary", "type": "main", "index": 0}]
            ]
        },
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": True,
        "callerPolicy": "workflowsFromSameOwner",
        "errorWorkflow": "",
    },
}

# Step 1: Create workflow
print("Creating n8n workflow...")
resp = requests.post(
    f"{N8N_BASE}/api/v1/workflows",
    headers=HEADERS,
    json=workflow_payload,
)

if resp.status_code in (200, 201):
    result = resp.json()
    workflow_id = result.get("id")
    print(f"SUCCESS: Workflow created! ID: {workflow_id}")
    print(f"   URL: {N8N_BASE}/workflow/{workflow_id}")

    # Step 2: Activate workflow
    print("\nActivating workflow...")
    activate_resp = requests.post(
        f"{N8N_BASE}/api/v1/workflows/{workflow_id}/activate",
        headers=HEADERS,
    )
    if activate_resp.status_code in (200, 201):
        print("SUCCESS: Workflow activated! It will run every 6 hours.")
    else:
        print(f"WARNING: Activation response: {activate_resp.status_code} - {activate_resp.text[:300]}")
        print("   You can activate it manually in the n8n UI.")
else:
    print(f"FAILED to create workflow: {resp.status_code}")
    print(resp.text[:500])
