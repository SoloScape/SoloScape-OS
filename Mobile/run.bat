@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem SoloScape original OpenOSRS dev launcher (Windows, local only).
rem Launches the original-engine diagnostic and the Stage 1 MCP stdio process.
rem The stdio process is not an MCP connection: an MCP host must spawn its own.
cd /d "%~dp0" || (
    echo [ERROR] Cannot open the Mobile directory.
    exit /b 1
)

if /i "%~1"=="--help" goto :help
if /i "%~1"=="--check" goto :check
if /i "%~1"=="--dry-run" goto :check
if not "%~1"=="" goto :usage_error

call :prerequisites
if errorlevel 1 exit /b 1

rem Only the original revision-240 engine diagnostic is supported by Stage 1.
rem Do not start npm run dev (that is the separate WebGL preview).
powershell.exe -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3097/' -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content.Contains('Original OpenOSRS engine')) { exit 0 } } catch {} exit 1" >nul 2>&1
if errorlevel 1 (
    echo [START] Original OpenOSRS dev server: npm run dev:original-engine
    start "SoloScape Original Engine Dev" /D "%CD%" "%ComSpec%" /D /K "npm run dev:original-engine"
    if errorlevel 1 (
        echo [ERROR] Unable to launch the original-engine dev terminal.
        exit /b 1
    )
) else (
    echo [READY] Original-engine diagnostic is already running on 127.0.0.1:3097.
)

rem A configured OpenAI Secure MCP Tunnel makes the bridge usable from ChatGPT.
rem Never put a runtime API key in this batch file, its arguments or source control.
if defined CONTROL_PLANE_TUNNEL_ID if defined CONTROL_PLANE_API_KEY goto :launch_tunnel

echo [START] Stage 1 MCP bridge: node dev-bridge\stdio.mjs
start "SoloScape Stage 1 MCP Bridge" /D "%CD%" "%ComSpec%" /D /K "node dev-bridge\stdio.mjs"
if errorlevel 1 (
    echo [ERROR] Unable to launch the MCP terminal.
    exit /b 1
)
echo [INFO] This standalone stdio console is not connected to ChatGPT.
echo [INFO] For direct access, follow dev-bridge\README.md to configure a Secure MCP Tunnel.
goto :started

:launch_tunnel
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "dev-bridge\connect-chatgpt.ps1" -Mode check
if errorlevel 1 (
    echo [ERROR] Tunnel prerequisites failed. See dev-bridge\README.md.
    exit /b 1
)
echo [START] ChatGPT Secure MCP Tunnel for SoloScape
start "SoloScape ChatGPT Secure MCP Tunnel" /D "%CD%" "%ComSpec%" /D /K "powershell.exe -NoProfile -ExecutionPolicy Bypass -File dev-bridge\connect-chatgpt.ps1 -Mode run"
if errorlevel 1 (
    echo [ERROR] Unable to launch the Secure MCP Tunnel terminal.
    exit /b 1
)
echo [INFO] Tunnel connection requires your ChatGPT plugin registration.
goto :started

:started
echo.
echo [OK] Original engine: http://127.0.0.1:3097/
echo [INFO] Game server on 127.0.0.1:43594 must be started separately.
exit /b 0

:check
call :prerequisites
if errorlevel 1 exit /b 1
echo [CHECK] Would start npm run dev:original-engine unless already running.
if defined CONTROL_PLANE_TUNNEL_ID (
    if defined CONTROL_PLANE_API_KEY (
        echo [CHECK] Would run ChatGPT Secure MCP Tunnel from dev-bridge\connect-chatgpt.ps1.
        goto :check_done
    )
)
echo [CHECK] Would start node dev-bridge\stdio.mjs in a standalone terminal.
:check_done
echo [CHECK] No processes started.
exit /b 0

:prerequisites
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found on PATH. Install Node.js 22.16 or newer.
    exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm.cmd not found on PATH.
    exit /b 1
)
if not exist "dev-bridge\stdio.mjs" (
    echo [ERROR] Stage 1 MCP bridge is missing from Mobile\dev-bridge.
    exit /b 1
)
if not exist "teavm-poc\target\engine\javascript\engine.js" (
    echo [ERROR] The compiled original engine is missing.
    echo         First run: npm run build:openosrs-engine
    exit /b 1
)
exit /b 0

:help
echo Usage: run.bat [--check ^| --dry-run ^| --help]
echo Starts the original OpenOSRS dev diagnostic and a Stage 1 MCP stdio terminal.
echo --check validates prerequisites without starting processes.
echo MCP hosts must launch the stdio server themselves to connect to its tools.
exit /b 0

:usage_error
echo [ERROR] Unknown argument: %~1
call :help
exit /b 2
