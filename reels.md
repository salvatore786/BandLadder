# BandLadder IELTS/PTE Reel Generator — Architecture Reference

This document captures the complete pipeline logic for generating, uploading, and posting IELTS/PTE listening practice reels on Instagram and YouTube Shorts.

## Project Location
- **Path**: `D:\ielts-reel-generator\`
- **Platform**: Windows 11, Python 3.12
- **Video rendering**: Remotion (Node.js) at `remotion-video/`

---

## Pipeline Overview (3 Phases)

```
PHASE 1: Generate (5:30 AM IST daily)
  Task Scheduler → run_daily.bat → run_daily_pipeline.py --count 9
    → generate_reel.py --batch 9  (LLM content → TTS audio → Remotion video → thumbnail → caption)
    → upload_to_drive.py          (videos + thumbs → Google Drive via n8n webhook)
    → cleanup local files

PHASE 2: Store (Google Drive)
  Drive folder holds .mp4 + _thumb.jpg pairs with captions in file description

PHASE 3: Post (n8n workflow, 9 triggers/day at 7,9,11,13,15,17,19,21,23 IST)
  Pick oldest reel from Drive → upload to tmpfiles.org → post to Instagram + YouTube Shorts → delete from Drive
```

---

## Phase 1: Daily Generation

### Entry Point
- **Trigger**: Windows Task Scheduler `BandLadder_Daily_Reels` at 5:30 AM IST
- **Script chain**: `run_daily.bat` → `run_daily_pipeline.py` → `generate_reel.py` → `upload_to_drive.py`
- **Reliability**: 3 retry attempts in bat file, Python path fallback, health check verification, crash handler

### Step 1 — Content Selection (`generate_reel.py --batch 9`)
- Reads `content/content_plan.json` — entries across 9 question types
- Picks 1 unused entry per type (round-robin), marks as `used`
- Each entry has: `scenario`, `category`, `question_type`, `id`, `used` flag

### 9 Question Types (Generator Registry)
| Type | Class | Exam | Composition ID |
|------|-------|------|----------------|
| `form_completion` | FormCompletionGenerator | IELTS | FormCompletion |
| `highlight_incorrect` | HighlightIncorrectGenerator | PTE | HighlightIncorrect |
| `matching_classification` | MatchingClassificationGenerator | IELTS | MatchingClassification |
| `mcq_multiple` | MCQMultipleGenerator | PTE | MCQMultiple |
| `mcq_single` | MCQSingleGenerator | IELTS | MCQSingle |
| `mcq_single_pte` | MCQSinglePTEGenerator | PTE | MCQSinglePTE |
| `note_completion` | NoteCompletionGenerator | IELTS | NoteCompletion |
| `sentence_completion` | SentenceCompletionGenerator | IELTS | SentenceCompletion |
| `table_completion` | TableCompletionGenerator | IELTS | TableCompletion |

Each generator extends `BaseGenerator` (in `generators/base.py`) and implements:
- `build_prompt(scenario, category)` — LLM prompt for content generation
- `validate_response(data)` — validate LLM JSON output
- `build_remotion_props(content, duration, audio_filename)` — props for video render
- `get_sample_content()` — test mode fallback

### Step 2 — LLM Content Generation
- **API**: Groq (model: `llama-3.3-70b-versatile`)
- **Env var**: `GROQ_API_KEY`
- System prompt: "You are an IELTS/PTE content generator. Return ONLY valid JSON."
- 3 retries with rate limit handling (10s/20s/30s backoff)
- Output: JSON with question text, answer options, correct answer, `audio_script`, `voice_accent`

### Step 3 — TTS Audio Generation
- **Engine**: edge-tts (Microsoft Neural Voices)
- **Dialogue detection**: If `audio_script` contains `Speaker A:`, `Speaker B:` labels → multi-voice dialogue
- **Voice map**:
  - Speaker A: `en-GB-RyanNeural` (British male)
  - Speaker B: `en-AU-NatashaNeural` (Australian female)
  - Speaker C: `en-US-GuyNeural` (American male)
  - Speaker D: `en-IE-EmilyNeural` (Irish female)
  - Monologue fallback: `en-GB-RyanNeural`
- Dialogue segments merged with 400ms silence gaps via pydub
- Output: MP3 audio file

### Step 4 — Video Rendering (Remotion)
- **Remotion project**: `remotion-video/` (React + TypeScript)
- **Resolution**: 1080x1920 (9:16 portrait), 30fps
- **Process**:
  1. Copy audio to `remotion-video/public/`
  2. Write props to `input-props.json`
  3. `npx remotion render src/index.ts {CompositionId} output.mp4 --props input-props.json --codec h264`
- **Hook intro**: 5-second animated intro with question type label (configurable via `HOOK_INTRO_DURATION`)
- **CTA**: Pre-rendered `content/cta_swipe_voiced.mp4` appended to end via ffmpeg concat
- Output: `output/{type}_{id}_{date}.mp4` (typically 3-12 MB)

### Step 5 — Thumbnail Extraction
- `ffmpeg -y -ss 3.0 -i video.mp4 -frames:v 1 -q:v 2 thumb.jpg`
- Captures at 3 seconds (the hook frame)
- Output: `content/thumbnails/{name}_thumb.jpg`

### Step 6 — Caption Generation
- LLM generates Instagram caption: hook emoji + question/statement, CTA, 15-20 hashtags
- Must include: `#IELTS #IELTSPreparation #BandLadder #IELTSListening`
- PTE types also include: `#PTE #PTEAcademic #PTEListening`
- Output: `content/captions/{name}_caption.txt`

---

## Phase 2: Upload to Google Drive

### Script: `upload_to_drive.py`
- Checks `content/upload_log.json` for already-uploaded files
- For each new video in `output/`:
  1. HTTP POST binary to n8n webhook: `https://n8n.srv1258291.hstgr.cloud/webhook/upload-reel`
     - Headers: `x-filename` (file name), `x-caption` (URL-encoded caption)
  2. n8n webhook receives binary → uploads to Google Drive folder
  3. Same process for matching `_thumb.jpg`
  4. Logs `drive_file_id` + `thumb_file_id` in `upload_log.json`
- After upload, pipeline deletes local .mp4 files (Step 3 cleanup)

### Google Drive Folder
- **Folder ID**: `1pO0qBAwlPQLFzDOCZsAYzMttsgJigB64`
- Contains: `{name}.mp4` + `{name}_thumb.jpg` pairs
- Caption stored in file description metadata

---

## Phase 3: n8n Posting Workflow

### Workflow: "BandLadder Reel Poster + YouTube Shorts"
- **Workflow ID**: `lj2ZXWIvNDZmti3y`
- **Instance**: `https://n8n.srv1258291.hstgr.cloud`
- **Triggers**: Schedule at hours 7, 9, 11, 13, 15, 17, 19, 21, 23 IST (9 per day)

### Node Flow
```
Post Schedule (every 2h)
  → List Reel Files (query Drive folder for .mp4)
  → Pick Oldest Reel (Code: sort by name, pick first .mp4, find matching _thumb.jpg)
  → Download Video (from Drive)
  → Upload Video to TmpFiles (tmpfiles.org — Instagram/YouTube can't fetch from Drive)
  → Get Video URL (convert tmpfiles URL to direct download: tmpfiles.org/dl/...)
  → Has Thumbnail? (IF: $json.has_thumb === true)
      ├─ YES → Download Thumbnail → Upload Thumb to TmpFiles → Get Thumb URL
      └─ NO  → No Thumbnail (empty cover_url)
  → [PARALLEL BRANCHES after thumbnail handling]
      ├─ INSTAGRAM BRANCH:
      │   → Create Reel Container
      │     POST graph.facebook.com/v24.0/{IG_BUSINESS_ID}/media
      │     params: media_type=REELS, video_url, caption, cover_url, collaborators=["fizzielts_"]
      │   → Wait 60s (Instagram video processing)
      │   → Check Status (GET /media/{id}?fields=status_code,status)
      │   → Publish Reel (POST /media_publish with creation_id)
      │
      └─ YOUTUBE SHORTS BRANCH:
          → Prepare YT Metadata (Code: build title with #Shorts, description, tags)
            - JSON.stringify() the full API body as `yt_body` (avoids newline/quote escaping issues)
          → YT Init Upload
            POST googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable
            Body: raw string from $json.yt_body (specifyBody: "string")
            Headers: Content-Type: application/json, X-Upload-Content-Type: video/mp4
            fullResponse: true (to capture Location header)
          → Get YT Upload URL (extract Location header from response)
          → Download for YT (re-download video from Drive)
          → YT Upload Video (PUT binary to resumable upload URL, Content-Type: video/mp4, timeout: 300s)

  → [CONVERGE at Prepare Cleanup]
  → Prepare Cleanup (Code: extract file_id + thumb_id via try/catch across branches)
  → Remove Video (delete .mp4 from Drive)
  → Check Thumb → Has Thumb to Delete?
      ├─ YES → Remove Thumbnail (delete _thumb.jpg from Drive)
      └─ NO  → (end)
```

### Key n8n Design Patterns
- **Wait node context break**: After Wait 60s, `$("NodeName")` references to earlier nodes break. Must pass data through the chain explicitly via Code nodes.
- **Prepare Cleanup try/catch**: Tries Get Thumb URL → No Thumbnail → Pick Oldest Reel to find IDs regardless of which branch executed.
- **YouTube JSON body**: Built via `JSON.stringify()` in Code node, sent as raw string body to avoid expression interpolation breaking on newlines/quotes.
- **tmpfiles.org as CDN**: Instagram Graph API and YouTube require publicly accessible URLs. Drive URLs don't work. tmpfiles.org provides temporary direct download links.

---

## Key IDs & Credentials

| Resource | Value |
|----------|-------|
| Instagram Business ID | `17841480170396892` |
| Instagram Handle | `@bandladder_` |
| Instagram Collaborator | `@fizzielts_` |
| Google Drive Folder ID | `1pO0qBAwlPQLFzDOCZsAYzMttsgJigB64` |
| n8n Poster Workflow ID | `lj2ZXWIvNDZmti3y` |
| n8n Webhook Workflow ID | `2rv3ZU1O6x6NclTt` |
| n8n Instance | `n8n.srv1258291.hstgr.cloud` |
| Upload Webhook URL | `https://n8n.srv1258291.hstgr.cloud/webhook/upload-reel` |
| Facebook Graph API Credential | `21RJddQlSqo5ebO3` (Facebook Graph account 3) |
| Google Drive Credential | `f2CGoaFye8PSrXzj` |
| YouTube Category ID | `27` (Education) |
| Groq Model | `llama-3.3-70b-versatile` |
| LinkedIn Company Page ID | `112087960` |

---

## File Structure

```
D:\ielts-reel-generator\
├── config.py                    # Central config (paths, video settings)
├── generate_reel.py             # Main generator orchestrator
├── upload_to_drive.py           # Upload videos/thumbs via n8n webhook
├── run_daily_pipeline.py        # Daily pipeline: generate → upload → cleanup
├── run_daily.bat                # Task Scheduler entry point (retries, logging)
├── health_check.py              # Post-pipeline verification
├── webhook_server.py            # Local webhook for n8n upload receiver
├── update_workflow_thumbnail.py # Deploy n8n poster workflow via API
│
├── generators/                  # Question type implementations
│   ├── base.py                  # Abstract BaseGenerator class
│   ├── form_completion.py
│   ├── highlight_incorrect.py
│   ├── matching_classification.py
│   ├── mcq_multiple.py
│   ├── mcq_single.py
│   ├── mcq_single_pte.py
│   ├── note_completion.py
│   ├── sentence_completion.py
│   └── table_completion.py
│
├── remotion-video/              # Remotion (React) video rendering project
│   ├── src/
│   │   ├── index.ts             # Composition registry (Root)
│   │   └── compositions/        # React components per question type
│   └── public/                  # Temp audio files during render
│
├── content/
│   ├── content_plan.json        # Content strategy with entries per type
│   ├── upload_log.json          # Track what's been uploaded to Drive
│   ├── captions/                # Generated Instagram captions (.txt)
│   ├── thumbnails/              # Extracted video thumbnails (.jpg)
│   └── cta_swipe_voiced.mp4     # CTA end screen appended to every reel
│
├── output/                      # Generated videos (deleted after upload)
└── logs/
    ├── daily_pipeline.log       # Pipeline execution log
    └── task_scheduler.log       # Windows Task Scheduler wrapper log
```

---

## Reliability & Error Handling

1. **run_daily.bat**: 3 retry attempts with 60s/120s waits, Python path fallback (`python` then full path)
2. **run_daily_pipeline.py**: Crash handler wraps `main()` in try/except, logs to file
3. **health_check.py**: Verifies videos generated, thumbnails exist, Drive upload confirmed, content plan not depleted, n8n workflows active with correct node count
4. **Task Scheduler**: `RunLevel Highest`, `StartWhenAvailable`, `RestartCount 3`, `LogonType S4U`
5. **Content plan warning**: Health check warns at <18 entries (2 days) or <9 entries (1 day)
6. **LLM retries**: 3 attempts with rate limit backoff (Groq 429 handling)
7. **Upload retries**: 300s timeout per video upload

---

## Adding New Question Types

1. Create `generators/new_type.py` extending `BaseGenerator`
2. Implement: `question_type`, `remotion_composition_id`, `build_prompt()`, `validate_response()`, `build_remotion_props()`, `get_sample_content()`
3. For PTE types: override `exam_type` property to return `"PTE"`
4. Register in `generate_reel.py` → `GENERATOR_REGISTRY` dict
5. Add display label in `QUESTION_TYPE_LABELS` dict
6. Create Remotion composition in `remotion-video/src/compositions/`
7. Add entries to `content/content_plan.json`

---

## Adapting for a New Product/Brand

To replicate this pipeline for a different content type:

1. **Content Plan**: Create new `content_plan.json` with your scenarios/categories
2. **Generators**: Create new generator classes with LLM prompts for your content
3. **Remotion Compositions**: Design new video templates in React
4. **Config**: Update `config.py` with new paths, video settings
5. **Upload**: Same webhook + Drive pattern works — just change folder ID
6. **n8n Workflow**: Clone the poster workflow, update Drive folder ID, Instagram account ID, captions
7. **Credentials**: Set up new Instagram Business Account, Google Drive OAuth, YouTube OAuth in n8n

---

## Environment Notes

- **Bash tool warning**: PowerShell `$_` gets mangled to `extglob` in Bash tool — always use .ps1 script files for loops
- **C: drive (243GB) tight**: Keep project data on D: (710GB)
- **Video size**: Typically 3-12 MB per reel (1080x1920, 30fps, h264)
- **Generation time**: ~1.5 min per reel (LLM + TTS + Remotion render)
- **Full pipeline**: ~15 min for 9 reels + upload
- **Brand rule**: LIGHT colors only for infographics. Dark colors prohibited.
