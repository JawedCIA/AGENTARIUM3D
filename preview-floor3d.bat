@echo off
rem Local preview. Starts a small web server in this folder and opens the page.
rem Close this window to stop the server.
cd /d "%~dp0"
start "" "http://127.0.0.1:8765/"
python -m http.server 8765 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Could not start the server. If port 8765 is already in use, the page may already be
  echo available at http://127.0.0.1:8765/
  pause
)
