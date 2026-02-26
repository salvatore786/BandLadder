#!/usr/bin/env python3
"""Deploy the BandLadder Reel Poster workflow to n8n."""

import json
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
HEADERS = {"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"}

# Credentials
GDRIVE_CRED_ID = "f2CGoaFye8PSrXzj"
GDRIVE_CRED_NAME = "Google Drive account"
FB_GRAPH_CRED_ID = "21RJddQlSqo5ebO3"
FB_GRAPH_CRED_NAME = "Facebook Graph account 3"
IG_BUSINESS_ID = "17841480170396892"

# Your existing Google Drive folder
LISTENING_FOLDER_ID = "1Z-MjOx8fhW9fklinOyM3eR7gLPeUu0no"

# Code for "Pick Oldest Reel" node
PICK_OLDEST_CODE = """const items = $input.all();
const mp4Files = items.filter(item => item.json.name && item.json.name.endsWith('.mp4'));
if (mp4Files.length === 0) {
  throw new Error('No .mp4 files found in listening folder');
}
const file = mp4Files[0].json;
const caption = file.description || 'Practice your listening skills! Follow @bandladder_ for daily practice!\\n\\n#IELTS #BandLadder #IELTSListening #IELTSPreparation';
return [{
  json: {
    file_id: file.id,
    file_name: file.name,
    caption: caption
  }
}];"""

# Code for "Prepare Video URL" node
PREPARE_URL_CODE = """const fileId = $('Pick Oldest Reel').item.json.file_id;
const caption = $('Pick Oldest Reel').item.json.caption;
const fileName = $('Pick Oldest Reel').item.json.file_name;
const videoUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
return [{
  json: {
    file_id: fileId,
    file_name: fileName,
    caption: caption,
    video_url: videoUrl
  }
}];"""

workflow = {
    "name": "BandLadder Reel Poster (Graph API)",
    "nodes": [
        # 1. Schedule Trigger
        {
            "parameters": {
                "rule": {
                    "interval": [
                        {"triggerAtHour": 7},
                        {"triggerAtHour": 9},
                        {"triggerAtHour": 11},
                        {"triggerAtHour": 13},
                        {"triggerAtHour": 15},
                        {"triggerAtHour": 17},
                        {"triggerAtHour": 19},
                        {"triggerAtHour": 21},
                        {"triggerAtHour": 23},
                    ]
                }
            },
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [-600, 300],
            "id": "aa111111-1111-1111-1111-111111111111",
            "name": "Post Schedule",
        },
        # 2. List files in listening folder
        {
            "parameters": {
                "operation": "list",
                "returnAll": False,
                "limit": 10,
                "filter": {
                    "folderId": {
                        "__rl": True,
                        "value": LISTENING_FOLDER_ID,
                        "mode": "id",
                    }
                },
                "options": {
                    "fields": [
                        "id",
                        "name",
                        "description",
                        "webContentLink",
                        "mimeType",
                    ]
                },
            },
            "type": "n8n-nodes-base.googleDrive",
            "typeVersion": 3,
            "position": [-340, 300],
            "id": "bb222222-2222-2222-2222-222222222222",
            "name": "List Reel Files",
            "credentials": {
                "googleDriveOAuth2Api": {
                    "id": GDRIVE_CRED_ID,
                    "name": GDRIVE_CRED_NAME,
                }
            },
        },
        # 3. Pick oldest .mp4
        {
            "parameters": {"jsCode": PICK_OLDEST_CODE},
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [-80, 300],
            "id": "cc333333-3333-3333-3333-333333333333",
            "name": "Pick Oldest Reel",
        },
        # 4. Share file publicly
        {
            "parameters": {
                "operation": "share",
                "fileId": {
                    "__rl": True,
                    "value": "={{ $json.file_id }}",
                    "mode": "id",
                },
                "permissionsUi": {
                    "permissionsValues": {"role": "reader", "type": "anyone"}
                },
                "options": {},
            },
            "type": "n8n-nodes-base.googleDrive",
            "typeVersion": 3,
            "position": [180, 300],
            "id": "dd444444-4444-4444-4444-444444444444",
            "name": "Make Public",
            "credentials": {
                "googleDriveOAuth2Api": {
                    "id": GDRIVE_CRED_ID,
                    "name": GDRIVE_CRED_NAME,
                }
            },
        },
        # 5. Prepare video URL
        {
            "parameters": {"jsCode": PREPARE_URL_CODE},
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [440, 300],
            "id": "ee555555-5555-5555-5555-555555555555",
            "name": "Prepare Video URL",
        },
        # 6. Create Reel Container
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
                        {"name": "video_url", "value": "={{ $json.video_url }}"},
                        {"name": "caption", "value": "={{ $json.caption }}"},
                    ]
                },
                "options": {"timeout": 120000},
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [700, 300],
            "id": "ff666666-6666-6666-6666-666666666666",
            "name": "Create Reel Container",
            "credentials": {
                "facebookGraphApi": {
                    "id": FB_GRAPH_CRED_ID,
                    "name": FB_GRAPH_CRED_NAME,
                }
            },
        },
        # 7. Wait 60s
        {
            "parameters": {"amount": 60, "unit": "seconds"},
            "type": "n8n-nodes-base.wait",
            "typeVersion": 1.1,
            "position": [960, 300],
            "id": "gg777777-7777-7777-7777-777777777777",
            "name": "Wait 60s",
            "webhookId": "wait-reel-process-bandladder",
        },
        # 8. Check container status
        {
            "parameters": {
                "method": "GET",
                "url": '=https://graph.facebook.com/v24.0/{{ $("Create Reel Container").item.json.id }}',
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "facebookGraphApi",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {"name": "fields", "value": "status_code,status"}
                    ]
                },
                "options": {},
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1220, 300],
            "id": "hh888888-8888-8888-8888-888888888888",
            "name": "Check Status",
            "credentials": {
                "facebookGraphApi": {
                    "id": FB_GRAPH_CRED_ID,
                    "name": FB_GRAPH_CRED_NAME,
                }
            },
        },
        # 9. Publish the reel
        {
            "parameters": {
                "method": "POST",
                "url": f"https://graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media_publish",
                "authentication": "predefinedCredentialType",
                "nodeCredentialType": "facebookGraphApi",
                "sendQuery": True,
                "queryParameters": {
                    "parameters": [
                        {
                            "name": "creation_id",
                            "value": '={{ $("Create Reel Container").item.json.id }}',
                        }
                    ]
                },
                "options": {},
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [1480, 300],
            "id": "ii999999-9999-9999-9999-999999999999",
            "name": "Publish Reel",
            "credentials": {
                "facebookGraphApi": {
                    "id": FB_GRAPH_CRED_ID,
                    "name": FB_GRAPH_CRED_NAME,
                }
            },
        },
        # 10. Delete from Drive after posting
        {
            "parameters": {
                "operation": "delete",
                "fileId": {
                    "__rl": True,
                    "value": '={{ $("Pick Oldest Reel").item.json.file_id }}',
                    "mode": "id",
                },
                "options": {},
            },
            "type": "n8n-nodes-base.googleDrive",
            "typeVersion": 3,
            "position": [1740, 300],
            "id": "jj101010-1010-1010-1010-101010101010",
            "name": "Remove from Drive",
            "credentials": {
                "googleDriveOAuth2Api": {
                    "id": GDRIVE_CRED_ID,
                    "name": GDRIVE_CRED_NAME,
                }
            },
        },
    ],
    "connections": {
        "Post Schedule": {
            "main": [[{"node": "List Reel Files", "type": "main", "index": 0}]]
        },
        "List Reel Files": {
            "main": [[{"node": "Pick Oldest Reel", "type": "main", "index": 0}]]
        },
        "Pick Oldest Reel": {
            "main": [[{"node": "Make Public", "type": "main", "index": 0}]]
        },
        "Make Public": {
            "main": [[{"node": "Prepare Video URL", "type": "main", "index": 0}]]
        },
        "Prepare Video URL": {
            "main": [
                [{"node": "Create Reel Container", "type": "main", "index": 0}]
            ]
        },
        "Create Reel Container": {
            "main": [[{"node": "Wait 60s", "type": "main", "index": 0}]]
        },
        "Wait 60s": {
            "main": [[{"node": "Check Status", "type": "main", "index": 0}]]
        },
        "Check Status": {
            "main": [[{"node": "Publish Reel", "type": "main", "index": 0}]]
        },
        "Publish Reel": {
            "main": [[{"node": "Remove from Drive", "type": "main", "index": 0}]]
        },
    },
    "settings": {"executionOrder": "v1", "timezone": "Asia/Kolkata"},
}

# Deploy
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
else:
    print(f"Error: {resp.text[:500]}")
