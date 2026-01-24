@echo off
:: This ensures the script runs in the correct folder
cd /d "%~dp0"

echo =================================================
echo      Tele-Flix Auto Splitter (Zero Loss)
echo =================================================
echo.

:: Run the python script
python splitter_ffmpeg.py

:: Pause so you can read the "Success" message before closing
pause