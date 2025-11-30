@echo off
setlocal

REM Root of your project
set ROOT=C:\cabinet-calculator

REM Ensure scripts folder exists
if not exist "%ROOT%\scripts" mkdir "%ROOT%\scripts"

REM Run the PowerShell refactor script
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\apply_start_refactor.ps1"

echo:
echo ✅ Start page refactor complete. If you see no errors above:
echo    - Run:  cd C:\cabinet-calculator && npm run dev
echo    - Optional: npm run lint   (after you install eslint deps)
echo:
pause
endlocal
