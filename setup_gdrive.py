#!/usr/bin/env python3
"""
Setup Google Drive upload capability.
Uses Google Drive API with OAuth2 (same as n8n uses).
Run this once to authenticate, then upload_to_drive.py handles the rest.
"""

import json
import os
import sys
from pathlib import Path

# Check if google packages are available
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    print("[OK] Google API packages found")
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install google-auth-oauthlib google-api-python-client")
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE = BASE_DIR / "gdrive_token.json"
CREDS_FILE = BASE_DIR / "gdrive_credentials.json"

SCOPES = ["https://www.googleapis.com/auth/drive.file"]

def setup():
    """Run OAuth2 flow to get Drive access token."""
    if not CREDS_FILE.exists():
        print(f"""
========================================================
  Google Drive Setup - One-time Configuration
========================================================

  1. Go to: https://console.cloud.google.com
  2. Select your project (or create one)
  3. Enable "Google Drive API"
  4. Go to Credentials -> Create OAuth Client ID
     - Type: Desktop App
     - Name: BandLadder Reel Uploader
  5. Download the JSON credentials file
  6. Save it as:
     {CREDS_FILE}

  Then run this script again.
========================================================
""")
        return False

    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        print("[OK] Token saved successfully")

    # Test: list root folder
    service = build("drive", "v3", credentials=creds)
    results = service.files().list(pageSize=5, fields="files(id, name)").execute()
    files = results.get("files", [])
    print(f"[OK] Connected to Google Drive! Found {len(files)} files in root.")

    # Create BandLadder_Reels folder if it doesn't exist
    folder_name = "BandLadder_Reels"
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    folders = results.get("files", [])

    if folders:
        folder_id = folders[0]["id"]
        print(f"[OK] Found existing folder: {folder_name} (ID: {folder_id})")
    else:
        folder_metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        folder = service.files().create(body=folder_metadata, fields="id").execute()
        folder_id = folder["id"]
        print(f"[OK] Created folder: {folder_name} (ID: {folder_id})")

    # Create "posted" subfolder
    query = f"name='posted' and mimeType='application/vnd.google-apps.folder' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    if not results.get("files"):
        subfolder_metadata = {
            "name": "posted",
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [folder_id],
        }
        service.files().create(body=subfolder_metadata, fields="id").execute()
        print("[OK] Created 'posted' subfolder")

    # Save config
    config = {
        "folder_id": folder_id,
        "folder_name": folder_name,
    }
    config_file = BASE_DIR / "gdrive_config.json"
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)
    print(f"[OK] Config saved to {config_file}")

    print(f"\n[SUCCESS] Setup complete! Folder ID: {folder_id}")
    print("You can now run upload_to_drive.py to upload reels.")
    return True


if __name__ == "__main__":
    setup()
