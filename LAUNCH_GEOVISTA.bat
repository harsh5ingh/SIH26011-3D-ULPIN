@echo off
title GeoVISTA - Geospatial Volumetric Intelligence ^& Spatial Topology Architecture
color 0B

echo ===============================================================================
echo       GeoVISTA -- 3D ULPIN ^& Vertical Cadastre Mapping System
echo       SIH 2026 -- Software Edition (Problem Statement: PS26011)
echo       Ministry of Rural Development / Department of Land Resources (DoLR)
echo ===============================================================================
echo.

set "PROJECT_DIR=c:\Users\devan\Desktop\SIH PROTOTYPE 1"

echo [1/3] Verifying project directory...
if not exist "%PROJECT_DIR%" (
    echo [ERROR] Project folder not found at: "%PROJECT_DIR%"
    pause
    exit /b 1
)
echo       Found project at: "%PROJECT_DIR%"
echo.

echo [2/3] Starting GeoVISTA FastAPI Backend on http://localhost:8000 ...
start "GeoVISTA Backend (FastAPI)" cmd /k "cd /d ""%PROJECT_DIR%\backend"" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo       Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo.
echo [3/3] Starting GeoVISTA React Frontend on http://localhost:5173 ...
start "GeoVISTA Frontend (Vite + React)" cmd /k "cd /d ""%PROJECT_DIR%\frontend"" && cmd /c npm run dev"

echo       Waiting for frontend server...
timeout /t 3 /nobreak > nul

echo.
echo Opening default web browser to GeoVISTA Public Portal...
start http://localhost:5173

echo.
echo ===============================================================================
echo   GeoVISTA is now running!
echo.
echo   * Frontend Web App:     http://localhost:5173
echo   * Backend REST API:     http://localhost:8000
echo   * Swagger API Docs:     http://localhost:8000/docs
echo   * System Health Check:  http://localhost:8000/health
echo.
echo   To stop the servers, simply close the opened Backend and Frontend command
echo   windows.
echo ===============================================================================
echo.
pause
