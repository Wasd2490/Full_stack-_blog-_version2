@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem ============================================================
rem  Blog V2 - One-click start (production mode)
rem  Usage:  double-click this file, or run:  start.bat [port]
rem ============================================================

set "PGDIR=C:\Users\18886\postgres"
set "PGDATA=C:\Users\18886\pgdata"
set "PGLOG=C:\Users\18886\pgdata\server.log"
set "APP=%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=3005"

echo.
echo ============================================================
echo   Blog V2 startup   port=%PORT%
echo ============================================================
echo.

rem ---------- 1. PostgreSQL ----------
echo [1/4] Checking PostgreSQL ...
"%PGDIR%\bin\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo       not running - starting it ...
    "%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432 -c listen_addresses=localhost" start
    if errorlevel 1 (
        echo       [FAIL] PostgreSQL failed to start. Check: %PGLOG%
        pause
        exit /b 1
    )
    timeout /t 4 >nul
) else (
    echo       already running
)

rem ---------- 2. wait until DB accepts connections ----------
echo [2/4] Waiting for database ...
set "DBREADY=0"
for /l %%i in (1,1,20) do (
    "%PGDIR%\bin\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
    if !errorlevel! == 0 (
        set "DBREADY=1"
        goto :dbok
    )
    timeout /t 1 >nul
)
:dbok
if "%DBREADY%"=="0" (
    echo       [FAIL] Database not reachable after 20s
    pause
    exit /b 1
)
echo       ready

rem ---------- 3. build if needed ----------
echo [3/4] Checking build output ...
cd /d "%APP%"
if not exist ".next\BUILD_ID" (
    echo       no build found - building now, this takes 2-5 minutes ...
    call npx next build --webpack
    if errorlevel 1 (
        echo       [FAIL] Build failed
        pause
        exit /b 1
    )
) else (
    echo       build exists
)

rem ---------- 4. start Next.js ----------
echo [4/4] Starting Next.js on port %PORT% ...
start "BlogV2-Server" cmd /c "cd /d %APP% && npx next start -p %PORT%"
timeout /t 8 >nul

echo.
echo ============================================================
echo   Started.  Open  http://localhost:%PORT%
echo   Admin   :  http://localhost:%PORT%/login
echo   Account :  test@test.com  /  admin12345
echo.
echo   Keep the "BlogV2-Server" window open - closing it stops
echo   the site. To stop everything, run stop.bat
echo ============================================================
echo.
start http://localhost:%PORT%
timeout /t 5 >nul
exit /b 0
