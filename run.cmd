@echo off
setlocal

:: Define project paths relative to this script
set "BACKEND_DIR=%~dp0backend\src\PocketWise.Api"
set "FRONTEND_DIR=%~dp0frontend\pocketwise-web"

echo Backend URL: http://localhost:5268
echo Frontend URL: http://localhost:3000

:: Check if Windows Terminal (wt.exe) is available
where wt.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting PocketWise in Windows Terminal...
    wt.exe --title "PocketWise Backend" -d "%BACKEND_DIR%" cmd.exe /k "echo Backend URL: http://localhost:5268 & dotnet watch run" ; new-tab --title "PocketWise Frontend" -d "%FRONTEND_DIR%" cmd.exe /k "echo Frontend URL: http://localhost:3000 & npm run dev"
) else (
    echo Windows Terminal was not found. Opening separate Command Prompt windows...
    start "PocketWise Backend" /D "%BACKEND_DIR%" cmd.exe /k "echo Backend URL: http://localhost:5268 & dotnet watch run"
    start "PocketWise Frontend" /D "%FRONTEND_DIR%" cmd.exe /k "echo Frontend URL: http://localhost:3000 & npm run dev"
)

endlocal
