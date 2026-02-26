@echo off
REM ================================================================
REM  BandLadder Webhook Server + ngrok Tunnel Starter
REM  Starts the Flask webhook server and ngrok tunnel
REM  Run this once to enable n8n scheduled reel generation
REM ================================================================

cd /d "D:\ielts-reel-generator"

REM ── Set credentials (Cerebras primary, Groq fallback) ──
REM  Set these as system environment variables or replace below:
set CEREBRAS_API_KEY=%CEREBRAS_API_KEY%
set GROQ_API_KEY=%GROQ_API_KEY%
set INSTAGRAM_USERNAME=%INSTAGRAM_USERNAME%
set INSTAGRAM_PASSWORD=%INSTAGRAM_PASSWORD%

echo.
echo ========================================
echo  Starting BandLadder Webhook Server
echo ========================================
echo.

REM Kill any existing instances
taskkill /F /FI "WINDOWTITLE eq BandLadder*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ngrok*" >nul 2>&1

REM Start webhook server in background
start "BandLadder Webhook" /MIN python webhook_server.py

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Start ngrok tunnel
echo Starting ngrok tunnel...
start "ngrok Tunnel" /MIN "C:\Users\Administrator\ngrok\ngrok.exe" http 5111

timeout /t 5 /nobreak > nul

REM Auto-update n8n workflow with new ngrok URL
echo Updating n8n workflow with new ngrok URL...
python update_n8n_url.py

echo.
echo ========================================
echo  All services running!
echo  Webhook: http://localhost:5111
echo  ngrok:   Check http://localhost:4040
echo  n8n workflow auto-updated with new URL
echo ========================================
