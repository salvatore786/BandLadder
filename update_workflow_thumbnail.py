#!/usr/bin/env python3
"""
Update the n8n Reel Poster workflow to support thumbnails.
Adds cover_url parameter to Instagram Graph API call.
"""

import json
import requests

N8N_BASE = "https://n8n.srv1258291.hstgr.cloud"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTFmMzA4YS0zZWFiLTQ3MTktYWI1ZC1jMGEwZDQwMDllY2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5NDMyODcxLCJleHAiOjE3NzE5NzQwMDB9.fO-tyo20_2Yi34Ah6SZPZP6t9gi6j8B-eS6AXsip4Ho"
WORKFLOW_ID = "lj2ZXWIvNDZmti3y"
DRIVE_FOLDER = "1pO0qBAwlPQLFzDOCZsAYzMttsgJigB64"

IG_BUSINESS_ID = "17841480170396892"
DRIVE_CRED_ID = "f2CGoaFye8PSrXzj"
FB_CRED_ID = "21RJddQlSqo5ebO3"

headers = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Content-Type": "application/json",
}

# ── Node definitions ────────────────────────────────────────────────────────

nodes = [
    # 1. Schedule Trigger — 9x/day
    {
        "parameters": {
            "rule": {
                "interval": [
                    {"triggerAtHour": h} for h in [7, 9, 11, 13, 15, 17, 19, 21, 23]
                ]
            }
        },
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [-800, 300],
        "id": "aa111111-1111-1111-1111-111111111111",
        "name": "Post Schedule",
    },

    # 2. List all files in Drive folder
    {
        "parameters": {
            "resource": "fileFolder",
            "searchMethod": "query",
            "queryString": f"'{DRIVE_FOLDER}' in parents and trashed=false",
            "limit": 50,
            "filter": {},
            "options": {},
        },
        "type": "n8n-nodes-base.googleDrive",
        "typeVersion": 3,
        "position": [-560, 300],
        "id": "bb222222-2222-2222-2222-222222222222",
        "name": "List Reel Files",
        "credentials": {"googleDriveOAuth2Api": {"id": DRIVE_CRED_ID, "name": "Google Drive account"}},
    },

    # 3. Pick oldest .mp4 + find matching thumbnail
    {
        "parameters": {
            "jsCode": """const items = $input.all();
const allFiles = items.map(i => i.json);

// Find .mp4 files
const mp4Files = allFiles.filter(f => f.name && f.name.endsWith('.mp4'));
if (mp4Files.length === 0) {
  throw new Error('No .mp4 files found in Drive folder');
}

// Pick the first (oldest) mp4
const video = mp4Files[0];
const caption = video.description || 'Practice your listening skills! Follow @bandladder_ for daily practice!\\n\\n#IELTS #BandLadder #IELTSListening #IELTSPreparation';

// Find matching thumbnail: video_name_thumb.jpg
const baseName = video.name.replace('.mp4', '');
const thumbName = baseName + '_thumb.jpg';
const thumb = allFiles.find(f => f.name === thumbName);

return [{
  json: {
    file_id: video.id,
    file_name: video.name,
    caption: caption,
    thumb_id: thumb ? thumb.id : null,
    thumb_name: thumb ? thumb.name : null,
    has_thumb: !!thumb
  }
}];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [-300, 300],
        "id": "cc333333-3333-3333-3333-333333333333",
        "name": "Pick Oldest Reel",
    },

    # 4. Download Video from Drive
    {
        "parameters": {
            "operation": "download",
            "fileId": {
                "__rl": True,
                "value": '={{ $("Pick Oldest Reel").item.json.file_id }}',
                "mode": "id",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.googleDrive",
        "typeVersion": 3,
        "position": [-40, 300],
        "id": "dl-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "name": "Download Video",
        "credentials": {"googleDriveOAuth2Api": {"id": DRIVE_CRED_ID, "name": "Google Drive account"}},
    },

    # 5. Upload Video to TmpFiles
    {
        "parameters": {
            "method": "POST",
            "url": "https://tmpfiles.org/api/v1/upload",
            "sendBody": True,
            "contentType": "multipart-form-data",
            "bodyParameters": {
                "parameters": [
                    {"parameterType": "formBinaryData", "name": "file", "inputDataFieldName": "data"}
                ]
            },
            "options": {"timeout": 120000},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [200, 300],
        "id": "up-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "name": "Upload Video to TmpFiles",
    },

    # 6. Get Video Direct URL + check if we have a thumbnail
    {
        "parameters": {
            "jsCode": """const resp = $input.item.json;
const tmpUrl = resp.data ? resp.data.url : resp.url;
const directUrl = tmpUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
const caption = $("Pick Oldest Reel").item.json.caption;
const fileId = $("Pick Oldest Reel").item.json.file_id;
const fileName = $("Pick Oldest Reel").item.json.file_name;
const hasThumb = $("Pick Oldest Reel").item.json.has_thumb;
const thumbId = $("Pick Oldest Reel").item.json.thumb_id;
const thumbName = $("Pick Oldest Reel").item.json.thumb_name;

return [{
  json: {
    video_url: directUrl,
    caption: caption,
    file_id: fileId,
    file_name: fileName,
    has_thumb: hasThumb,
    thumb_id: thumbId,
    thumb_name: thumbName,
    cover_url: ""
  }
}];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [440, 300],
        "id": "ex-cccccccc-cccc-cccc-cccc-cccccccccccc",
        "name": "Get Video URL",
    },

    # 7. IF has thumbnail → branch
    {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [
                    {
                        "id": "thumb-check",
                        "leftValue": "={{ $json.has_thumb }}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "equals"},
                    }
                ],
                "combinator": "and",
            },
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [680, 300],
        "id": "if-dddddddd-dddd-dddd-dddd-dddddddddddd",
        "name": "Has Thumbnail?",
    },

    # 8. Download Thumbnail from Drive (TRUE branch)
    {
        "parameters": {
            "operation": "download",
            "fileId": {
                "__rl": True,
                "value": "={{ $json.thumb_id }}",
                "mode": "id",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.googleDrive",
        "typeVersion": 3,
        "position": [920, 200],
        "id": "dl-thumb-eeee-eeee-eeee-eeeeeeeeeeee",
        "name": "Download Thumbnail",
        "credentials": {"googleDriveOAuth2Api": {"id": DRIVE_CRED_ID, "name": "Google Drive account"}},
    },

    # 9. Upload Thumbnail to TmpFiles
    {
        "parameters": {
            "method": "POST",
            "url": "https://tmpfiles.org/api/v1/upload",
            "sendBody": True,
            "contentType": "multipart-form-data",
            "bodyParameters": {
                "parameters": [
                    {"parameterType": "formBinaryData", "name": "file", "inputDataFieldName": "data"}
                ]
            },
            "options": {"timeout": 60000},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1160, 200],
        "id": "up-thumb-ffff-ffff-ffff-ffffffffffff",
        "name": "Upload Thumb to TmpFiles",
    },

    # 10. Get Thumb URL + Merge with video data
    {
        "parameters": {
            "jsCode": """const resp = $input.item.json;
const tmpUrl = resp.data ? resp.data.url : resp.url;
const coverUrl = tmpUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");

// Get video data from earlier node
const videoData = $("Get Video URL").item.json;

return [{
  json: {
    video_url: videoData.video_url,
    caption: videoData.caption,
    file_id: videoData.file_id,
    file_name: videoData.file_name,
    thumb_id: videoData.thumb_id,
    cover_url: coverUrl
  }
}];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1400, 200],
        "id": "url-thumb-gggg-gggg-gggg-gggggggggggg",
        "name": "Get Thumb URL",
    },

    # 11. No Thumbnail — pass video data through (FALSE branch)
    {
        "parameters": {
            "jsCode": """const videoData = $("Get Video URL").item.json;
return [{
  json: {
    video_url: videoData.video_url,
    caption: videoData.caption,
    file_id: videoData.file_id,
    file_name: videoData.file_name,
    thumb_id: null,
    cover_url: ""
  }
}];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [1400, 420],
        "id": "no-thumb-hhhh-hhhh-hhhh-hhhhhhhhhhhh",
        "name": "No Thumbnail",
    },

    # 12. Create Reel Container — with cover_url if available
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
                    {"name": "cover_url", "value": "={{ $json.cover_url }}"},
                ]
            },
            "options": {"timeout": 120000},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1680, 300],
        "id": "ff666666-6666-6666-6666-666666666666",
        "name": "Create Reel Container",
        "credentials": {"facebookGraphApi": {"id": FB_CRED_ID, "name": "Facebook Graph account 3"}},
    },

    # 13. Wait 160s for processing
    {
        "parameters": {"amount": 160},
        "type": "n8n-nodes-base.wait",
        "typeVersion": 1.1,
        "position": [1920, 300],
        "id": "gg777777-7777-7777-7777-777777777777",
        "name": "Wait 60s",
        "webhookId": "wait-reel-process-bandladder",
    },

    # 14. Check Status
    {
        "parameters": {
            "url": '=https://graph.facebook.com/v24.0/{{ $("Create Reel Container").item.json.id }}',
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "facebookGraphApi",
            "sendQuery": True,
            "queryParameters": {"parameters": [{"name": "fields", "value": "status_code,status"}]},
            "options": {},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [2160, 300],
        "id": "hh888888-8888-8888-8888-888888888888",
        "name": "Check Status",
        "credentials": {"facebookGraphApi": {"id": FB_CRED_ID, "name": "Facebook Graph account 3"}},
    },

    # 15. Publish Reel
    {
        "parameters": {
            "method": "POST",
            "url": f"https://graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media_publish",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "facebookGraphApi",
            "sendQuery": True,
            "queryParameters": {
                "parameters": [
                    {"name": "creation_id", "value": '={{ $("Create Reel Container").item.json.id }}'}
                ]
            },
            "options": {},
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [2400, 300],
        "id": "ii999999-9999-9999-9999-999999999999",
        "name": "Publish Reel",
        "credentials": {"facebookGraphApi": {"id": FB_CRED_ID, "name": "Facebook Graph account 3"}},
    },

    # 16. Prepare Cleanup — extract file_id & thumb_id for deletion
    {
        "parameters": {
            "jsCode": """// Try to get IDs from the thumbnail branch or no-thumbnail branch
let fileId, thumbId;
try {
  const d = $("Get Thumb URL").item.json;
  fileId = d.file_id;
  thumbId = d.thumb_id;
} catch(e) {
  try {
    const d = $("No Thumbnail").item.json;
    fileId = d.file_id;
    thumbId = d.thumb_id;
  } catch(e2) {
    const d = $("Pick Oldest Reel").item.json;
    fileId = d.file_id;
    thumbId = d.thumb_id;
  }
}
return [{ json: { file_id: fileId, thumb_id: thumbId } }];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [2640, 300],
        "id": "prep-cleanup-nnnn-nnnn-nnnn-nnnnnnnnnnnn",
        "name": "Prepare Cleanup",
    },

    # 17. Remove Video from Drive
    {
        "parameters": {
            "operation": "delete",
            "fileId": {
                "__rl": True,
                "value": "={{ $json.file_id }}",
                "mode": "id",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.googleDrive",
        "typeVersion": 3,
        "position": [2880, 300],
        "id": "jj101010-1010-1010-1010-101010101010",
        "name": "Remove Video",
        "credentials": {"googleDriveOAuth2Api": {"id": DRIVE_CRED_ID, "name": "Google Drive account"}},
    },

    # 18. Check if thumbnail needs deletion
    {
        "parameters": {
            "jsCode": """const thumbId = $("Prepare Cleanup").item.json.thumb_id;
if (!thumbId) {
  return [{ json: { skipped: true, message: "No thumbnail to delete" } }];
}
return [{ json: { thumb_id: thumbId, delete: true } }];"""
        },
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [3120, 300],
        "id": "chk-thumb-kkkk-kkkk-kkkk-kkkkkkkkkkkk",
        "name": "Check Thumb",
    },

    # 19. IF should delete thumb
    {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                "conditions": [
                    {
                        "id": "del-thumb-check",
                        "leftValue": "={{ $json.delete }}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "equals"},
                    }
                ],
                "combinator": "and",
            },
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [3360, 300],
        "id": "if-del-llll-llll-llll-llllllllllllll",
        "name": "Has Thumb to Delete?",
    },

    # 20. Delete Thumbnail from Drive
    {
        "parameters": {
            "operation": "delete",
            "fileId": {
                "__rl": True,
                "value": "={{ $json.thumb_id }}",
                "mode": "id",
            },
            "options": {},
        },
        "type": "n8n-nodes-base.googleDrive",
        "typeVersion": 3,
        "position": [3600, 200],
        "id": "del-thumb-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
        "name": "Remove Thumbnail",
        "credentials": {"googleDriveOAuth2Api": {"id": DRIVE_CRED_ID, "name": "Google Drive account"}},
    },
]

# ── Connections ──────────────────────────────────────────────────────────────
connections = {
    "Post Schedule": {"main": [[{"node": "List Reel Files", "type": "main", "index": 0}]]},
    "List Reel Files": {"main": [[{"node": "Pick Oldest Reel", "type": "main", "index": 0}]]},
    "Pick Oldest Reel": {"main": [[{"node": "Download Video", "type": "main", "index": 0}]]},
    "Download Video": {"main": [[{"node": "Upload Video to TmpFiles", "type": "main", "index": 0}]]},
    "Upload Video to TmpFiles": {"main": [[{"node": "Get Video URL", "type": "main", "index": 0}]]},
    "Get Video URL": {"main": [[{"node": "Has Thumbnail?", "type": "main", "index": 0}]]},
    # IF true (has thumbnail) → download + upload thumb
    "Has Thumbnail?": {
        "main": [
            [{"node": "Download Thumbnail", "type": "main", "index": 0}],  # true
            [{"node": "No Thumbnail", "type": "main", "index": 0}],        # false
        ]
    },
    "Download Thumbnail": {"main": [[{"node": "Upload Thumb to TmpFiles", "type": "main", "index": 0}]]},
    "Upload Thumb to TmpFiles": {"main": [[{"node": "Get Thumb URL", "type": "main", "index": 0}]]},
    # Both branches merge at Create Reel Container
    "Get Thumb URL": {"main": [[{"node": "Create Reel Container", "type": "main", "index": 0}]]},
    "No Thumbnail": {"main": [[{"node": "Create Reel Container", "type": "main", "index": 0}]]},
    # Continue posting pipeline
    "Create Reel Container": {"main": [[{"node": "Wait 60s", "type": "main", "index": 0}]]},
    "Wait 60s": {"main": [[{"node": "Check Status", "type": "main", "index": 0}]]},
    "Check Status": {"main": [[{"node": "Publish Reel", "type": "main", "index": 0}]]},
    "Publish Reel": {"main": [[{"node": "Prepare Cleanup", "type": "main", "index": 0}]]},
    "Prepare Cleanup": {"main": [[{"node": "Remove Video", "type": "main", "index": 0}]]},
    "Remove Video": {"main": [[{"node": "Check Thumb", "type": "main", "index": 0}]]},
    "Check Thumb": {"main": [[{"node": "Has Thumb to Delete?", "type": "main", "index": 0}]]},
    "Has Thumb to Delete?": {
        "main": [
            [{"node": "Remove Thumbnail", "type": "main", "index": 0}],  # true
            [],  # false — done
        ]
    },
}

# ── Build workflow payload ───────────────────────────────────────────────────
workflow = {
    "name": "BandLadder Reel Poster (Graph API)",
    "nodes": nodes,
    "connections": connections,
    "settings": {
        "executionOrder": "v1",
        "timezone": "Asia/Kolkata",
        "callerPolicy": "workflowsFromSameOwner",
    },
}

# ── Deploy ───────────────────────────────────────────────────────────────────
print(f"Updating workflow {WORKFLOW_ID}...")

resp = requests.put(
    f"{N8N_BASE}/api/v1/workflows/{WORKFLOW_ID}",
    headers=headers,
    json=workflow,
    verify=False,
    timeout=30,
)

if resp.status_code == 200:
    data = resp.json()
    print(f"  Updated: {data['name']}")
    print(f"  Nodes: {len(data['nodes'])}")
    print(f"  Active: {data['active']}")
    print("\nWorkflow updated with thumbnail support!")
    print("New flow:")
    print("  Schedule → List Files → Pick Oldest → Download Video → Upload to Tmp")
    print("  → Get URL → Has Thumbnail? → (Yes: Download+Upload Thumb) → Create Reel")
    print("  → Wait → Check → Publish → Remove Video → Remove Thumbnail")
else:
    print(f"  FAILED: {resp.status_code}")
    print(f"  {resp.text[:500]}")
