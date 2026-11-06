@echo off
rem Opens MedLib in the browser at http://localhost:8765 (close this window to stop it)
cd /d "%~dp0"
start "" http://localhost:8765
python -m http.server 8765
