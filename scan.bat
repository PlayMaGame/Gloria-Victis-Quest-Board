@echo off
call "%~dp0.venv\Scripts\activate.bat"
cd /d "%~dp0inventory_scanner"
python scanner.py %*
echo.
echo --- Done (exit code: %ERRORLEVEL%) ---
pause
