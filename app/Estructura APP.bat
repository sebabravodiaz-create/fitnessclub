@echo off
REM Ruta de la carpeta app
set "APP_DIR=C:\GYM\app"

REM Archivo donde guardaremos la estructura
set "OUTPUT=%APP_DIR%\estructura_app.txt"

echo Generando estructura de archivos en %APP_DIR% ...
tree "%APP_DIR%" /F > "%OUTPUT%"

echo ==========================================
echo La estructura se ha guardado en:
echo %OUTPUT%
echo ==========================================
pause