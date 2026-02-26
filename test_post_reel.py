#!/usr/bin/env python3
"""
Test the full reel posting pipeline step by step:
1. List files in Google Drive folder via n8n webhook
2. Share file publicly
3. Post to Instagram via Graph API
4. Delete from Drive after success

This script simulates what the n8n workflow does, but directly via APIs.
"""

import requests
import json
import time
import sys
import urllib.parse

# === CONFIG ===
N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
N8N_HEADERS = {"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"}

DRIVE_FOLDER_ID = "1XgNriZ7OfCXixt6vBA0SSgo_t1O6bGOu"
IG_BUSINESS_ID = "17841480170396892"

# We need the Facebook Graph API access token
# Let's get it from the n8n credential
FB_GRAPH_CRED_ID = "21RJddQlSqo5ebO3"


def step1_list_drive_files():
    """List .mp4 files in the Drive folder using n8n's Google Drive credential."""
    print("\n=== STEP 1: List Drive Files ===")

    # We can't directly use n8n's Google Drive credential from outside
    # But we can create a simple webhook workflow to list files
    # OR we can use the existing workflow's test execution

    # Let's use n8n API to get the credential's access token
    # Actually n8n API doesn't expose credential secrets

    # Alternative: Use a webhook that returns file list
    # We already have the upload webhook active, let's create a list webhook

    # Simplest: Call Google Drive API through n8n HTTP Request
    # Let's create a temporary workflow with webhook that lists files

    print("  Creating temp list-files webhook...")

    workflow = {
        "name": "TEMP - List Drive Files",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "GET",
                    "path": "list-drive-mp4",
                    "responseMode": "lastNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 300],
                "id": "list-wh-1111-1111-1111-111111111111",
                "name": "Webhook",
                "webhookId": "list-drive-mp4-webhook"
            },
            {
                "parameters": {
                    "resource": "fileFolder",
                    "operation": "search",
                    "searchMethod": "query",
                    "queryString": f"'{DRIVE_FOLDER_ID}' in parents and mimeType='video/mp4' and trashed=false",
                    "limit": 10,
                    "options": {}
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [280, 300],
                "id": "list-gd-2222-2222-2222-222222222222",
                "name": "List Files",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": "f2CGoaFye8PSrXzj",
                        "name": "Google Drive account"
                    }
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "List Files", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }

    # Create
    resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=N8N_HEADERS, json=workflow)
    if resp.status_code != 200:
        print(f"  Failed to create workflow: {resp.status_code} {resp.text[:200]}")
        return None, None

    wf_id = resp.json()["id"]
    print(f"  Workflow created: {wf_id}")

    # Activate
    resp2 = requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=N8N_HEADERS)
    print(f"  Activated: {resp2.json().get('active')}")

    time.sleep(3)

    # Call webhook
    resp3 = requests.get(f"{N8N_BASE}/webhook/list-drive-mp4", timeout=30)
    print(f"  Webhook response: {resp3.status_code}")

    # Clean up
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/deactivate", headers=N8N_HEADERS)
    requests.delete(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=N8N_HEADERS)

    if resp3.status_code == 200:
        files = resp3.json()
        if isinstance(files, list):
            print(f"  Found {len(files)} files")
            for f in files:
                print(f"    - {f.get('name', '?')} (ID: {f.get('id', '?')})")
            return files, wf_id
        elif isinstance(files, dict):
            print(f"  Found 1 file: {files.get('name', '?')}")
            return [files], wf_id
    else:
        print(f"  Error: {resp3.text[:300]}")

    return None, None


def step2_share_file(file_id):
    """Share a file publicly via n8n Google Drive."""
    print(f"\n=== STEP 2: Share File Publicly (ID: {file_id}) ===")

    workflow = {
        "name": "TEMP - Share File",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "GET",
                    "path": "share-drive-file",
                    "responseMode": "lastNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 300],
                "id": "share-wh-1111-1111-1111-111111111111",
                "name": "Webhook",
                "webhookId": "share-drive-file-webhook"
            },
            {
                "parameters": {
                    "operation": "share",
                    "fileId": {
                        "__rl": True,
                        "value": file_id,
                        "mode": "id"
                    },
                    "permissionsUi": {
                        "permissionsValues": {
                            "role": "reader",
                            "type": "anyone"
                        }
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [280, 300],
                "id": "share-gd-2222-2222-2222-222222222222",
                "name": "Share File",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": "f2CGoaFye8PSrXzj",
                        "name": "Google Drive account"
                    }
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Share File", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }

    resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=N8N_HEADERS, json=workflow)
    if resp.status_code != 200:
        print(f"  Failed: {resp.status_code} {resp.text[:200]}")
        return False

    wf_id = resp.json()["id"]
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=N8N_HEADERS)
    time.sleep(3)

    resp3 = requests.get(f"{N8N_BASE}/webhook/share-drive-file", timeout=30)
    print(f"  Share response: {resp3.status_code}")

    # Clean up
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/deactivate", headers=N8N_HEADERS)
    requests.delete(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=N8N_HEADERS)

    if resp3.status_code == 200:
        print(f"  File shared publicly!")
        return True
    else:
        print(f"  Error: {resp3.text[:300]}")
        return False


def step3_create_reel_container(video_url, caption):
    """Create Instagram Reel container via Graph API through n8n."""
    print(f"\n=== STEP 3: Create Reel Container ===")
    print(f"  Video URL: {video_url}")
    print(f"  Caption: {caption[:80]}...")

    workflow = {
        "name": "TEMP - Create Reel",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "GET",
                    "path": "create-reel-container",
                    "responseMode": "lastNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 300],
                "id": "reel-wh-1111-1111-1111-111111111111",
                "name": "Webhook",
                "webhookId": "create-reel-container-webhook"
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": f"https://graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "facebookGraphApi",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "media_type", "value": "REELS"},
                            {"name": "video_url", "value": video_url},
                            {"name": "caption", "value": caption}
                        ]
                    },
                    "options": {"timeout": 120000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [280, 300],
                "id": "reel-http-2222-2222-2222-222222222222",
                "name": "Create Reel",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": "Facebook Graph account 3"
                    }
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Create Reel", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }

    resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=N8N_HEADERS, json=workflow)
    if resp.status_code != 200:
        print(f"  Failed: {resp.status_code} {resp.text[:200]}")
        return None

    wf_id = resp.json()["id"]
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=N8N_HEADERS)
    time.sleep(3)

    resp3 = requests.get(f"{N8N_BASE}/webhook/create-reel-container", timeout=120)
    print(f"  Create Reel response: {resp3.status_code}")

    # Clean up
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/deactivate", headers=N8N_HEADERS)
    requests.delete(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=N8N_HEADERS)

    if resp3.status_code == 200:
        result = resp3.json()
        container_id = result.get("id")
        print(f"  Container ID: {container_id}")
        return container_id
    else:
        print(f"  Error: {resp3.text[:500]}")
        return None


def step4_check_and_publish(container_id):
    """Check container status and publish the reel."""
    print(f"\n=== STEP 4: Wait + Check + Publish ===")
    print(f"  Container ID: {container_id}")
    print(f"  Waiting 60 seconds for Instagram to process video...")

    time.sleep(60)

    # Check status + Publish in one workflow
    workflow = {
        "name": "TEMP - Publish Reel",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "GET",
                    "path": "publish-reel",
                    "responseMode": "lastNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 300],
                "id": "pub-wh-1111-1111-1111-111111111111",
                "name": "Webhook",
                "webhookId": "publish-reel-webhook"
            },
            {
                "parameters": {
                    "method": "GET",
                    "url": f"https://graph.facebook.com/v24.0/{container_id}",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "facebookGraphApi",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "fields", "value": "status_code,status"}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [280, 300],
                "id": "pub-check-2222-2222-2222-222222222222",
                "name": "Check Status",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": "Facebook Graph account 3"
                    }
                }
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": f"https://graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media_publish",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "facebookGraphApi",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "creation_id", "value": container_id}
                        ]
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [560, 300],
                "id": "pub-publish-3333-3333-3333-333333333333",
                "name": "Publish",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": "Facebook Graph account 3"
                    }
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Check Status", "type": "main", "index": 0}]]},
            "Check Status": {"main": [[{"node": "Publish", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }

    resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=N8N_HEADERS, json=workflow)
    if resp.status_code != 200:
        print(f"  Failed: {resp.status_code} {resp.text[:200]}")
        return None

    wf_id = resp.json()["id"]
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=N8N_HEADERS)
    time.sleep(3)

    resp3 = requests.get(f"{N8N_BASE}/webhook/publish-reel", timeout=60)
    print(f"  Publish response: {resp3.status_code}")

    # Clean up
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/deactivate", headers=N8N_HEADERS)
    requests.delete(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=N8N_HEADERS)

    if resp3.status_code == 200:
        result = resp3.json()
        media_id = result.get("id")
        print(f"  PUBLISHED! Media ID: {media_id}")
        return media_id
    else:
        print(f"  Error: {resp3.text[:500]}")
        return None


def step5_delete_from_drive(file_id):
    """Delete the posted video from Drive."""
    print(f"\n=== STEP 5: Delete from Drive ===")

    workflow = {
        "name": "TEMP - Delete File",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "GET",
                    "path": "delete-drive-file",
                    "responseMode": "lastNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 300],
                "id": "del-wh-1111-1111-1111-111111111111",
                "name": "Webhook",
                "webhookId": "delete-drive-file-webhook"
            },
            {
                "parameters": {
                    "operation": "delete",
                    "fileId": {
                        "__rl": True,
                        "value": file_id,
                        "mode": "id"
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [280, 300],
                "id": "del-gd-2222-2222-2222-222222222222",
                "name": "Delete File",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": "f2CGoaFye8PSrXzj",
                        "name": "Google Drive account"
                    }
                }
            }
        ],
        "connections": {
            "Webhook": {"main": [[{"node": "Delete File", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1"}
    }

    resp = requests.post(f"{N8N_BASE}/api/v1/workflows", headers=N8N_HEADERS, json=workflow)
    if resp.status_code != 200:
        print(f"  Failed: {resp.status_code}")
        return False

    wf_id = resp.json()["id"]
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/activate", headers=N8N_HEADERS)
    time.sleep(3)

    resp3 = requests.get(f"{N8N_BASE}/webhook/delete-drive-file", timeout=30)
    print(f"  Delete response: {resp3.status_code}")

    # Clean up
    requests.post(f"{N8N_BASE}/api/v1/workflows/{wf_id}/deactivate", headers=N8N_HEADERS)
    requests.delete(f"{N8N_BASE}/api/v1/workflows/{wf_id}", headers=N8N_HEADERS)

    return resp3.status_code == 200


if __name__ == "__main__":
    print("=" * 60)
    print("BANDLADDER REEL POSTING - STEP BY STEP TEST")
    print("=" * 60)

    # Step 1: List files
    files, _ = step1_list_drive_files()
    if not files:
        print("\nFAILED at Step 1 - No files found or webhook issue")
        print("The webhook activation via API may not work on self-hosted n8n.")
        print("Trying alternative approach...")
        sys.exit(1)

    # Pick first .mp4 file
    file = files[0] if isinstance(files, list) else files
    file_id = file.get("id")
    file_name = file.get("name", "unknown")
    caption = file.get("description") or "Practice your listening skills! Follow @bandladder_ for daily practice!\n\n#IELTS #BandLadder #IELTSListening #IELTSPreparation"

    print(f"\n  Selected: {file_name} (ID: {file_id})")

    # Step 2: Share publicly
    shared = step2_share_file(file_id)
    if not shared:
        print("\nFAILED at Step 2 - Could not share file")
        sys.exit(1)

    # Build video URL
    video_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    print(f"  Video URL: {video_url}")

    # Step 3: Create Reel Container
    container_id = step3_create_reel_container(video_url, caption)
    if not container_id:
        print("\nFAILED at Step 3 - Could not create reel container")
        sys.exit(1)

    # Step 4: Wait + Check + Publish
    media_id = step4_check_and_publish(container_id)
    if not media_id:
        print("\nFAILED at Step 4 - Could not publish reel")
        sys.exit(1)

    # Step 5: Delete from Drive
    deleted = step5_delete_from_drive(file_id)

    print("\n" + "=" * 60)
    print("SUCCESS! Reel posted to Instagram!")
    print(f"  File: {file_name}")
    print(f"  Media ID: {media_id}")
    print(f"  Deleted from Drive: {deleted}")
    print("=" * 60)
