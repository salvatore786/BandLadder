# BandLadder

BandLadder Analytics: SQL, Python, and n8n Automation Workflows.

## n8n Workflows

This repository contains n8n automation workflows for Bandladder - an IELTS/PTE/CELPIP preparation business.

| Workflow | Description |
|----------|-------------|
| **Bandladder_AI_Scheduling** | Telegram bot for AI-powered meeting scheduling with Google Calendar integration |
| **Ielts** | Main IELTS content generation workflow - creates slides and posts Instagram carousels |
| **IELTS_Instagram_Carousel_Poster** | Posts IELTS content as Instagram carousel from Google Drive |
| **Content_Machine** | AI-powered content generation for social media |
| **GitHub_to_Socials_Auto_Poster** | Automatically posts GitHub updates to LinkedIn & sends Telegram notification |
| **Daily_Team_Task_Assigner** | AI-powered daily task assignment for team members at 9AM via Telegram |
| **Daily_Pulse_Report** | Daily automated reporting workflow |
| **insta_post** | Instagram posting automation |
| **master_content** | Master content management workflow |
| **spoken_english_spoken_fast** | Spoken English content automation |
| **Hackernews_to_AI_Clone_Videos** | Converts Hacker News articles to AI video content |
| **Hygen** | Hygen video generation integration |

## Setup

1. Import workflows into your n8n instance
2. Configure credentials for each service:
   - Google Drive / Google Slides / Google Calendar
   - Telegram Bot
   - Facebook/Instagram Graph API
   - Google Gemini API

## n8n Instance

- URL: `https://n8n.srv1258291.hstgr.cloud`

## Note

Credential IDs are preserved but tokens/secrets are removed for security. You'll need to reconfigure credentials after import.

## Key Workflows

### Bandladder AI Scheduling
Receives Telegram messages, uses AI to extract meeting details, creates Google Calendar events, and sends confirmation back via Telegram.

### IELTS Content Workflow
1. AI generates IELTS speaking content
2. Creates Google Slides presentation
3. Exports slides as images
4. Posts as Instagram carousel
5. Sends Telegram notification

---

*Exported on 2026-01-20*
