@echo off
setlocal
for /d %%J in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do if exist "%%~fJ\bin\java.exe" set "JAVA_HOME=%%~fJ"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
pushd "%~dp0" || exit /b 1

if exist "server\app\build\install\app\lib\app-0.0.1.jar" goto launch
echo Preparing the standalone server for the first launch...
call gradlew.bat :server:app:installDist --console=plain
if errorlevel 1 goto buildFailed

:launch
if not defined SOLOSCAPE_SERVER_HEAP set "SOLOSCAPE_SERVER_HEAP=2g"
java -XX:AutoBoxCacheMax=65535 -Xms256m -Xmx%SOLOSCAPE_SERVER_HEAP% -XX:MinHeapFreeRatio=5 -XX:MaxHeapFreeRatio=20 -XX:+G1PeriodicGCInvokesConcurrent -XX:G1PeriodicGCInterval=15000 %SOLOSCAPE_SERVER_JAVA_OPTS% -cp "server\app\build\install\app\lib\*" org.rsmod.server.app.GameServerKt %*
set "RUN_EXIT_CODE=%ERRORLEVEL%"
goto finish

:buildFailed
set "RUN_EXIT_CODE=%ERRORLEVEL%"

:finish
popd
if "%~1"=="" pause
exit /b %RUN_EXIT_CODE%
