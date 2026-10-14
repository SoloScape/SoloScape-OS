@echo off
setlocal
rem Builds Client and Server, reusing unchanged Kotlin output where safe.
rem Pass --rebuild to force a full compilation.
python "%~dp0tools\build_runner.py" All %*
exit /b %errorlevel%
