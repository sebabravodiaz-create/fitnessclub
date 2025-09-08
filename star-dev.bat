@echo off
setlocal

set PORT=3000
set START_CMD=npm run dev

echo.
echo ==========================================
echo  NEXT.JS DEV SERVER (puerto %PORT%)
echo ==========================================
echo.

REM Matar proceso en el puerto si existe
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  taskkill /PID %%a /F >NUL 2>&1
)

REM Borrar cachés de Next
if exist ".next"    rmdir /s /q ".next"
if exist ".turbo"   rmdir /s /q ".turbo"
if exist ".vercel"  rmdir /s /q ".vercel"

REM Arrancar servidor de desarrollo
call %START_CMD%

endlocal