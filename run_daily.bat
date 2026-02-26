@echo off
REM ================================================================
REM  BandLadder Daily Pipeline (Robust Version)
REM  Generates 14 reels (9 listening + 5 cue cards) + uploads
REM  Includes: retries, verification, error logging
REM
REM  Schedule via Windows Task Scheduler at 5:30 AM IST daily
REM ================================================================

cd /d "D:\ielts-reel-generator"

REM ── Ensure log directory exists ──
if not exist "logs" mkdir logs

REM ── Log start ──
echo. >> logs\task_scheduler.log
echo ============================================== >> logs\task_scheduler.log
echo  Task Scheduler Start: %date% %time% >> logs\task_scheduler.log
echo ============================================== >> logs\task_scheduler.log

REM ── Set API Keys (Cerebras primary, Groq fallback) ──
REM  Set these as system environment variables or replace below:
set CEREBRAS_API_KEY=%CEREBRAS_API_KEY%
set GROQ_API_KEY=%GROQ_API_KEY%

REM ── Verify Python is available ──
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found in PATH >> logs\task_scheduler.log
    echo Trying full path... >> logs\task_scheduler.log
    "C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe" --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo FATAL: Python not found at all >> logs\task_scheduler.log
        exit /b 1
    )
    set PYTHON_CMD="C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe"
    goto :start_pipeline
)
set PYTHON_CMD=python

:start_pipeline
echo Python found, starting pipeline... >> logs\task_scheduler.log

REM ── Attempt 1 ──
echo [Attempt 1/3] Running pipeline... >> logs\task_scheduler.log
%PYTHON_CMD% run_daily_pipeline.py 2>> logs\task_scheduler.log
if %ERRORLEVEL% EQU 0 goto :verify

REM ── Attempt 2 (wait 60s and retry) ──
echo [Attempt 1 FAILED] Waiting 60s before retry... >> logs\task_scheduler.log
timeout /t 60 /nobreak >nul
echo [Attempt 2/3] Running pipeline... >> logs\task_scheduler.log
%PYTHON_CMD% run_daily_pipeline.py 2>> logs\task_scheduler.log
if %ERRORLEVEL% EQU 0 goto :verify

REM ── Attempt 3 (wait 120s and retry) ──
echo [Attempt 2 FAILED] Waiting 120s before retry... >> logs\task_scheduler.log
timeout /t 120 /nobreak >nul
echo [Attempt 3/3] Running pipeline... >> logs\task_scheduler.log
%PYTHON_CMD% run_daily_pipeline.py 2>> logs\task_scheduler.log
if %ERRORLEVEL% EQU 0 goto :verify

REM ── All 3 attempts failed ──
echo FATAL: All 3 attempts failed! >> logs\task_scheduler.log
echo Check logs\daily_pipeline.log for details >> logs\task_scheduler.log
exit /b 1

:verify
REM ── Verify videos were actually uploaded ──
echo Verifying upload... >> logs\task_scheduler.log
%PYTHON_CMD% health_check.py >> logs\task_scheduler.log 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Health check failed but pipeline reported success >> logs\task_scheduler.log
)

echo Pipeline completed: %date% %time% >> logs\task_scheduler.log
exit /b 0
