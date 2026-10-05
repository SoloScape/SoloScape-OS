@echo off
setlocal
python "%~dp0tools\build_runner.py" All %*
exit /b %errorlevel%
