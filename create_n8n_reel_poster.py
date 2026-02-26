#!/usr/bin/env python3
"""
Create n8n workflow: Distributed Reel Poster via Instagram Graph API.

Architecture:
  LOCAL:  generate_reel.py -> upload_to_drive.py -> Google Drive folder
  CLOUD:  n8n Schedule -> Read Drive folder -> Graph API Post -> Move to "posted"

Flow:
  Post Schedule (9x/day) -> List Drive Files -> Pick Oldest -> Download Caption
  -> Create Reel Container (Graph API) -> Wait 30s -> Check Status -> Publish Reel
  -> Move to "posted" folder

No ngrok, no webhook server, no IP issues. 100% cloud-based posting.
"""

import json
import sys
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"

HEADERS = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json",
}

# Credentials from existing carousel workflow
FB_GRAPH_CRED_ID = "21RJddQlSqo5ebO3"
FB_GRAPH_CRED_NAME = "Facebook Graph account 3"
GDRIVE_CRED_ID = "f2CGoaFye8PSrXzj"
GDRIVE_CRED_NAME = "Google Drive account"
IG_BUSINESS_ID = "17841480170396892"

# Will be set after setup_gdrive.py creates the folder
DRIVE_FOLDER_ID = None  # Set this after running setup_gdrive.py


def build_workflow(folder_id: str) -> dict:
    """Build the n8n workflow JSON for distributed reel posting."""

    # Posting schedule: 9 times per day (IST hours)
    post_hours = [7, 9, 11, 13, 15, 17, 19, 21, 23]

    workflow = {
        "name": "BandLadder Reel Poster (Distributed - Graph API)",
        "nodes": [
            # 1. Schedule Trigger - 9x/day
            {
                "parameters": {
                    "rule": {
                        "interval": [{"triggerAtHour": h} for h in post_hours]
                    }
                },
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [-800, 300],
                "id": "sched-trigger",
                "name": "Post Schedule (9x/day)",
            },

            # 2. List files in BandLadder_Reels Drive folder (only .mp4)
            {
                "parameters": {
                    "operation": "list",
                    "returnAll": False,
                    "limit": 2,
                    "filter": {
                        "folderId": {
                            "__rl": True,
                            "value": folder_id,
                            "mode": "id",
                        },
                    },
                    "options": {
                        "fields": ["id", "name", "description", "webContentLink", "mimeType"],
                    },
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [-560, 300],
                "id": "list-drive-files",
                "name": "List Reel Files",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": GDRIVE_CRED_ID,
                        "name": GDRIVE_CRED_NAME,
                    }
                },
            },

            # 3. Filter only .mp4 files and pick the first one
            {
                "parameters": {
                    "jsCode": (
                        "const items = $input.all();\n"
                        "const mp4Files = items.filter(item => item.json.name && item.json.name.endsWith('.mp4'));\n"
                        "if (mp4Files.length === 0) {\n"
                        "  throw new Error('No .mp4 files found in BandLadder_Reels folder');\n"
                        "}\n"
                        "// Pick the first (oldest) mp4 file\n"
                        "const file = mp4Files[0].json;\n"
                        "// Caption is stored in the file description\n"
                        "const caption = file.description || "
                        "'\\ud83c\\udfa7 Practice your listening skills! Follow @bandladder for daily practice! \\ud83d\\udcaa\\n\\n#IELTS #BandLadder #IELTSPreparation';\n"
                        "return [{\n"
                        "  json: {\n"
                        "    file_id: file.id,\n"
                        "    file_name: file.name,\n"
                        "    caption: caption,\n"
                        "    web_content_link: file.webContentLink || ''\n"
                        "  }\n"
                        "}];\n"
                    )
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [-320, 300],
                "id": "pick-oldest",
                "name": "Pick Oldest Reel",
            },

            # 4. Download the video from Drive (as binary)
            {
                "parameters": {
                    "operation": "download",
                    "fileId": {
                        "__rl": True,
                        "value": "={{ $json.file_id }}",
                        "mode": "id",
                    },
                    "options": {},
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [-80, 300],
                "id": "download-video",
                "name": "Download Video",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": GDRIVE_CRED_ID,
                        "name": GDRIVE_CRED_NAME,
                    }
                },
            },

            # 5. Upload video to a temporary public hosting (use n8n binary -> temp URL)
            # Actually for Instagram Graph API, we need a publicly accessible video_url
            # Best approach: use Google Drive's webContentLink or share the file publicly
            {
                "parameters": {
                    "jsCode": (
                        "// Make file publicly accessible temporarily for Instagram to fetch\n"
                        "const fileId = $('Pick Oldest Reel').item.json.file_id;\n"
                        "const fileName = $('Pick Oldest Reel').item.json.file_name;\n"
                        "const caption = $('Pick Oldest Reel').item.json.caption;\n"
                        "// Use direct download link format\n"
                        "const videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;\n"
                        "return [{\n"
                        "  json: {\n"
                        "    file_id: fileId,\n"
                        "    file_name: fileName,\n"
                        "    caption: caption,\n"
                        "    video_url: videoUrl\n"
                        "  }\n"
                        "}];\n"
                    )
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [160, 300],
                "id": "prepare-url",
                "name": "Prepare Video URL",
            },

            # 6. Share file publicly (so Instagram can access it)
            {
                "parameters": {
                    "operation": "share",
                    "fileId": {
                        "__rl": True,
                        "value": "={{ $json.file_id }}",
                        "mode": "id",
                    },
                    "permissionsUi": {
                        "permissionsValues": {
                            "role": "reader",
                            "type": "anyone",
                        }
                    },
                    "options": {},
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [400, 300],
                "id": "share-file",
                "name": "Make Public",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": GDRIVE_CRED_ID,
                        "name": GDRIVE_CRED_NAME,
                    }
                },
            },

            # 7. Create Instagram Reel Container via Graph API
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
                            {"name": "video_url", "value": "={{ $('Prepare Video URL').item.json.video_url }}"},
                            {"name": "caption", "value": "={{ $('Prepare Video URL').item.json.caption }}"},
                        ]
                    },
                    "options": {"timeout": 120000},
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [640, 300],
                "id": "create-reel-container",
                "name": "Create Reel Container",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": FB_GRAPH_CRED_NAME,
                    }
                },
            },

            # 8. Wait for Instagram to process the video
            {
                "parameters": {
                    "amount": 45,
                    "unit": "seconds",
                },
                "type": "n8n-nodes-base.wait",
                "typeVersion": 1.1,
                "position": [880, 300],
                "id": "wait-process",
                "name": "Wait 45s",
                "webhookId": "wait-reel-process",
            },

            # 9. Check container status (optional but good practice)
            {
                "parameters": {
                    "method": "GET",
                    "url": f"=https://graph.facebook.com/v24.0/{{{{ $('Create Reel Container').item.json.id }}}}",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "facebookGraphApi",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "fields", "value": "status_code,status"},
                        ]
                    },
                    "options": {},
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1120, 300],
                "id": "check-status",
                "name": "Check Container Status",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": FB_GRAPH_CRED_NAME,
                    }
                },
            },

            # 10. Publish the reel
            {
                "parameters": {
                    "method": "POST",
                    "url": f"https://graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media_publish",
                    "authentication": "predefinedCredentialType",
                    "nodeCredentialType": "facebookGraphApi",
                    "sendQuery": True,
                    "queryParameters": {
                        "parameters": [
                            {"name": "creation_id", "value": "={{ $('Create Reel Container').item.json.id }}"},
                        ]
                    },
                    "options": {},
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1360, 300],
                "id": "publish-reel",
                "name": "Publish Reel",
                "credentials": {
                    "facebookGraphApi": {
                        "id": FB_GRAPH_CRED_ID,
                        "name": FB_GRAPH_CRED_NAME,
                    }
                },
            },

            # 11. Move video to "posted" subfolder in Drive
            {
                "parameters": {
                    "operation": "move",
                    "fileId": {
                        "__rl": True,
                        "value": "={{ $('Pick Oldest Reel').item.json.file_id }}",
                        "mode": "id",
                    },
                    "folderId": {
                        "__rl": True,
                        "value": "",  # Will be set to the "posted" subfolder ID
                        "mode": "id",
                    },
                    "options": {},
                },
                "type": "n8n-nodes-base.googleDrive",
                "typeVersion": 3,
                "position": [1600, 300],
                "id": "move-to-posted",
                "name": "Move to Posted",
                "credentials": {
                    "googleDriveOAuth2Api": {
                        "id": GDRIVE_CRED_ID,
                        "name": GDRIVE_CRED_NAME,
                    }
                },
            },

            # 12. Success summary
            {
                "parameters": {
                    "jsCode": (
                        "const fileName = $('Pick Oldest Reel').item.json.file_name;\n"
                        "const mediaId = $('Publish Reel').item.json.id;\n"
                        "return [{ json: { "
                        "success: true, "
                        "video_file: fileName, "
                        "media_id: mediaId, "
                        "posted_at: new Date().toISOString(), "
                        "method: 'graph_api_distributed' "
                        "} }];\n"
                    )
                },
                "type": "n8n-nodes-base.code",
                "typeVersion": 2,
                "position": [1840, 300],
                "id": "post-success",
                "name": "Post Success",
            },
        ],
        "connections": {
            "Post Schedule (9x/day)": {"main": [[{"node": "List Reel Files", "type": "main", "index": 0}]]},
            "List Reel Files": {"main": [[{"node": "Pick Oldest Reel", "type": "main", "index": 0}]]},
            "Pick Oldest Reel": {"main": [[{"node": "Download Video", "type": "main", "index": 0}]]},
            "Download Video": {"main": [[{"node": "Prepare Video URL", "type": "main", "index": 0}]]},
            "Prepare Video URL": {"main": [[{"node": "Make Public", "type": "main", "index": 0}]]},
            "Make Public": {"main": [[{"node": "Create Reel Container", "type": "main", "index": 0}]]},
            "Create Reel Container": {"main": [[{"node": "Wait 45s", "type": "main", "index": 0}]]},
            "Wait 45s": {"main": [[{"node": "Check Container Status", "type": "main", "index": 0}]]},
            "Check Container Status": {"main": [[{"node": "Publish Reel", "type": "main", "index": 0}]]},
            "Publish Reel": {"main": [[{"node": "Move to Posted", "type": "main", "index": 0}]]},
            "Move to Posted": {"main": [[{"node": "Post Success", "type": "main", "index": 0}]]},
        },
        "settings": {
            "executionOrder": "v1",
            "timezone": "Asia/Kolkata",
        },
    }

    return workflow


def create_workflow(folder_id: str):
    """Create the n8n workflow via API."""
    workflow_data = build_workflow(folder_id)

    resp = requests.post(
        f"{N8N_BASE}/api/v1/workflows",
        headers=HEADERS,
        json=workflow_data,
    )

    if resp.status_code in (200, 201):
        result = resp.json()
        wf_id = result.get("id")
        print(f"[OK] Workflow created: {wf_id}")
        print(f"     Name: {result.get('name')}")
        print(f"     URL: {N8N_BASE}/workflow/{wf_id}")

        # Activate it
        resp2 = requests.patch(
            f"{N8N_BASE}/api/v1/workflows/{wf_id}",
            headers=HEADERS,
            json={"active": True},
        )
        if resp2.status_code == 200:
            print("[OK] Workflow activated!")
        else:
            print(f"[WARN] Activation failed: {resp2.status_code} {resp2.text[:200]}")

        return wf_id
    else:
        print(f"[ERROR] Failed to create workflow: {resp.status_code}")
        print(resp.text[:500])
        return None


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder-id", required=True, help="Google Drive folder ID for BandLadder_Reels")
    args = parser.parse_args()

    create_workflow(args.folder_id)
