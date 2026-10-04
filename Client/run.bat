@echo off
setlocal
for /d %%J in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do if exist "%%~fJ\bin\java.exe" set "JAVA_HOME=%%~fJ"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
pushd "%~dp0" || exit /b 1
if exist "build\install\rsprox\lib\rsprox-1.0.5.jar" goto launch
echo Standalone client files are missing. Restore a prebuilt distribution to build\install\rsprox.
set "result=1"
goto finish

:launch
java %SOLOSCAPE_CLIENT_JAVA_OPTS% -cp "build\install\rsprox\lib\*" net.rsprox.gui.ProxyToolGuiKt %*
set "result=%errorlevel%"
goto finish

:finish
popd
exit /b %result%
