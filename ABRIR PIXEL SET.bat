@echo off
setlocal
title Pixel Set - Lanzador

cd /d "%~dp0"

echo.
echo  ========================================
echo          PIXEL SET - LANZADOR
echo  ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro Node.js.
  echo Instala la version LTS desde https://nodejs.org/
  echo y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro npm. Reinstala Node.js LTS.
  pause
  exit /b 1
)

REM Comprobar el ejecutable real de Vite, no solo la carpeta node_modules.
if not exist "node_modules\.bin\vite.cmd" (
  echo No se encontro Vite. Sincronizando package.json y package-lock.json e instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: No se pudieron instalar las dependencias.
    echo Comprueba tu conexion a Internet y vuelve a ejecutar este archivo.
    pause
    exit /b 1
  )
)

REM Verificacion final para evitar el error "spawn vite ENOENT".
if not exist "node_modules\.bin\vite.cmd" (
  echo.
  echo ERROR: Vite sigue sin estar instalado.
  echo Ejecuta npm install manualmente y revisa los mensajes de error.
  pause
  exit /b 1
)

echo Iniciando Pixel Set...
start "Pixel Set - servidor" cmd /k "cd /d ""%CD%"" && npm run dev"

echo Esperando a que el juego este listo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://localhost:8080'; $ready=$false; for($i=0; $i -lt 60; $i++){ try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){$ready=$true; break} } catch {}; Start-Sleep -Seconds 2 }; if($ready){Start-Process $url; exit 0}else{Write-Host 'No se pudo detectar el servidor en http://localhost:8080'; exit 1}"
if errorlevel 1 (
  echo.
  echo El servidor puede tardar mas o haber encontrado un error.
  echo Revisa la ventana "Pixel Set - servidor".
  pause
)

endlocal
