@echo off
setlocal
python "%~dp0..\tools\build_runner.py" Client %*
exit /b %errorlevel%
