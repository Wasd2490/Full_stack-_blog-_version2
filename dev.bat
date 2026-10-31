@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem ============================================================
rem  Blog V2 - start in DEVELOPMENT mode (hot reload)
rem  Use this when editing code. For production, use start.bat
rem  Usage:  dev.bat [port]     default 3005
rem ============================================================

set "PGDIR=C:\Users\18886\postgres"
set "PGDATA=C:\Users\18886\pgdata"
set "PGLOG=C:\Users\18886\pgdata\server.log"
set "APP=%~dp0"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=3005"

echo.
echo [1/2] Checking PostgreSQL ...
"%PGDIR%\bin\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
if errorlevel 1 (
    echo       starting PostgreSQL ...
    "%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" -l "%PGLOG%" -o "-p 5432 -c listen_addresses=localhost" start
    timeout /t 4 >nul
) else (
    echo       already running
)

echo [2/2] Starting dev server on port %PORT% ...
cd /d "%APP%"
start "BlogV2-Dev" cmd /c "cd /d %APP% && npx next dev -p %PORT%"
timeout /t 10 >nul
start http://localhost:%PORT%

echo.
echo   Dev server: http://localhost:%PORT%
echo   Save any file and the page reloads automatically.
echo   Close the "BlogV2-Dev" window (or run stop.bat) to stop.
echo.
timeout /t 5 >nul
exit /b 0
