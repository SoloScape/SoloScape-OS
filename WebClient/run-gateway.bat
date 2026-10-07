@echo off
cd /d "%~dp0"

set "WS_HOST=0.0.0.0"
call npm run dev:gateway
