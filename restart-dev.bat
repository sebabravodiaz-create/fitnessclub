@echo off
setlocal enabledelayedexpansion

REM ============================
REM Configurables
REM ============================
set PORT=3000
set START_CMD=npm run dev

REM Si llamas: restart-dev.bat deep
REM hará limpieza profunda (node_modules + npm ci)
set MODE=%1%

echo.
echo ==========================================
echo  NEXT.JS DEV RESTART (puerto %PORT%)
echo  Modo: %MODE%
echo ==========================================
echo.

REM 1) Matar proceso que ocupa el puerto (normalmente next dev)
echo [1/5] Buscando proceso en puerto %PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  set PID=%%a
)
if defined PID (
  echo    -> Encontrado PID %PID% en puerto %PORT%. Terminando...
  taskkill /PID %PID% /F >NUL 2>&1
  timeout /t 1 >NUL
) else (
  echo    -> No hay proceso escuchando en %PORT%. Ok.
)

REM 2) Cerrar cualquier node.exe “huérfano” de next dev (opcional)
echo [2/5] Terminando posibles node.exe de Next...
taskkill /IM node.exe /F >NUL 2>&1

REM 3) Limpiar caches
echo [3/5] Borrando caches locales (.next, .turbo, .vercel, .cache)...
if exist ".next"    rmdir /s /q ".next"
if exist ".turbo"   rmdir /s /q ".turbo"
if exist ".vercel"  rmdir /s /q ".vercel"
if exist ".cache"   rmdir /s /q ".cache"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM 4) Limpieza profunda opcional
if /I "%MODE%"=="deep" (
  echo [4/5] Limpieza profunda: borrando node_modules y reinstalando con npm ci...
  if exist "node_modules" rmdir /s /q "node_modules"
  if exist "package-lock.json" (
    echo    -> npm ci
    call npm ci
  ) else (
    echo    -> No hay package-lock.json, usando npm install
    call npm install
  )
) else (
  echo [4/5] Saltando limpieza profunda (usa: restart-dev.bat deep para forzarla).
)

REM 5) Reconstruir estructura y arrancar dev
echo [5/5] Iniciando servidor de desarrollo: %START_CMD%
echo.
call %START_CMD%

endlocal