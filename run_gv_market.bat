@echo off
title GV Market Link
cd /d "%~dp0"

echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    echo Download from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo Installing dependencies (first run may take a moment)...
pip install pyautogui pyperclip --quiet

echo.
echo Starting GV Market Link...
python gv_market_link.py

pause
