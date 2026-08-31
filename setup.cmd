@echo off
setlocal EnableExtensions

cd /d "%~dp0"
title Company OS Setup

:preflight
cls
echo Company OS Setup
echo Checking Docker Desktop and WSL2...

where docker >nul 2>nul
if errorlevel 1 goto docker_missing

where wsl.exe >nul 2>nul
if errorlevel 1 goto wsl_missing

wsl.exe --status >nul 2>nul
if errorlevel 1 goto wsl_missing

docker info >nul 2>nul
if errorlevel 1 goto docker_stopped

for /f "usebackq delims=" %%I in (`docker info --format "{{.OSType}}" 2^>nul`) do set "DOCKER_OS=%%I"
if /i not "%DOCKER_OS%"=="linux" goto linux_containers_required

docker compose version >nul 2>nul
if errorlevel 1 goto compose_missing

echo Opening the guided setup...
rem Arguments after the service name replace its Compose command, so keep the setup.py entry point explicit.
docker compose --profile setup run --rm setup python /distribution/setup.py launch
set "KAMDAR_ACTION=%ERRORLEVEL%"

if "%KAMDAR_ACTION%"=="0" exit /b 0
if "%KAMDAR_ACTION%"=="10" goto live_verify
if "%KAMDAR_ACTION%"=="11" goto static_verify
if "%KAMDAR_ACTION%"=="12" goto live_verify
if "%KAMDAR_ACTION%"=="13" goto dashboard
if "%KAMDAR_ACTION%"=="14" goto certify
if "%KAMDAR_ACTION%"=="130" goto cancelled
goto failed

:live_verify
call :start_runtime
if errorlevel 1 goto failed
call :start_webhook_if_enabled
if errorlevel 1 goto failed
echo Running the full health check...
docker compose --profile setup run --rm setup python /distribution/setup.py verify --live
set "VERIFY_EXIT=%ERRORLEVEL%"
goto verification_result

:static_verify
call :start_runtime
if errorlevel 1 goto failed
echo Checking the updated installation...
docker compose --profile setup run --rm setup python /distribution/setup.py verify
set "VERIFY_EXIT=%ERRORLEVEL%"
goto verification_result

:dashboard
call :start_runtime
if errorlevel 1 goto failed
start "" "http://localhost:9119"
echo Company OS dashboard opened: http://localhost:9119
pause
exit /b 0

:certify
echo Testing configured integrations...
docker compose --profile setup run --rm setup python /distribution/setup.py certify
set "CERTIFY_EXIT=%ERRORLEVEL%"
echo.
if "%CERTIFY_EXIT%"=="0" (
  echo All configured integrations passed.
) else if "%CERTIFY_EXIT%"=="1" (
  echo Integration certification was deferred. Run setup.cmd and choose Test integrations when ready.
) else (
  echo Integration certification did not pass. Review the failed row above and retry from setup.cmd.
)
pause
exit /b %CERTIFY_EXIT%

:verification_result
echo.
if "%VERIFY_EXIT%"=="0" (
  echo Company OS is ready. Dashboard: http://localhost:9119
) else (
  echo Company OS needs attention.
  echo Complete the action shown beside the failed check, then run setup.cmd again.
)
pause
exit /b %VERIFY_EXIT%

:start_runtime
echo Starting Hermes...
docker compose up -d gateway dashboard
exit /b %ERRORLEVEL%

:start_webhook_if_enabled
docker compose --profile setup run --rm setup python /distribution/setup.py webhook-enabled >nul 2>nul
if errorlevel 1 exit /b 0
echo Starting secure webhook ingress...
docker compose --profile webhook up -d --force-recreate ngrok
if errorlevel 1 goto webhook_rollback
docker compose --profile setup run --rm setup python /distribution/setup.py webhook-ingress-ready --wait 30
if errorlevel 1 (
  echo ngrok rejected its credentials or the assigned endpoint did not become reachable.
  docker compose --profile webhook logs --no-color --tail 20 ngrok
  goto webhook_rollback
)
docker compose --profile webhook ps --status running --services ngrok | findstr /x /c:"ngrok" >nul
if errorlevel 1 (
  echo The assigned endpoint responded, but this ngrok agent is not running.
  goto webhook_rollback
)
docker compose --profile setup run --rm setup python /distribution/setup.py webhook-commit
if errorlevel 1 goto webhook_rollback
exit /b 0

:webhook_rollback
docker compose --profile setup run --rm setup python /distribution/setup.py webhook-rollback
docker compose --profile setup run --rm setup python /distribution/setup.py webhook-enabled >nul 2>nul
if errorlevel 1 (
  docker compose --profile webhook stop ngrok >nul 2>nul
) else (
  docker compose --profile webhook up -d --force-recreate ngrok >nul 2>nul
)
exit /b 1

:docker_missing
echo.
echo Docker Desktop is required and was not found.
choice /c OX /m "Open the official Docker Desktop installer page, or exit"
if errorlevel 2 exit /b 2
start "" "https://docs.docker.com/desktop/setup/install/windows-install/"
exit /b 2

:docker_stopped
echo.
echo Docker Desktop is installed but is not ready.
echo Start Docker Desktop and wait until it reports Ready.
choice /c RX /m "Check again, or exit"
if errorlevel 2 exit /b 2
goto preflight

:wsl_missing
echo.
echo WSL2 is required and is not ready.
choice /c OX /m "Open the official WSL installation guide, or exit"
if errorlevel 2 exit /b 2
start "" "https://learn.microsoft.com/windows/wsl/install"
exit /b 2

:compose_missing
echo.
echo Docker Compose is unavailable. Update Docker Desktop, then try again.
choice /c RX /m "Check again, or exit"
if errorlevel 2 exit /b 2
goto preflight

:linux_containers_required
echo.
echo Docker Desktop is running Windows containers.
echo Switch Docker Desktop to Linux containers, then try again.
choice /c RX /m "Check again, or exit"
if errorlevel 2 exit /b 2
goto preflight

:cancelled
echo.
echo Setup stopped safely. Existing configuration was preserved.
pause
exit /b 0

:failed
echo.
echo Setup stopped safely. Existing profile data was preserved.
echo Run setup.cmd again and choose Repair setup if the problem continues.
pause
exit /b 2
