@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1
echo [INFO] SoloScape original Java engine (trusted private LAN only)
echo [INFO] Java game server must already be running on port 43594.
echo [INFO] Stop an existing npm run dev:original-engine before starting.
echo [INFO] The gamepack and original cache will be accessible to nearby devices.
echo [WARN] Never port-forward 3097/43595 or run on untrusted public Wi-Fi.
call npm run dev:original-engine:lan
exit /b %ERRORLEVEL%
