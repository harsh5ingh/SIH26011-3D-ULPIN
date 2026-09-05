@echo off
echo =========================================================================
echo   GeoVISTA — Geospatial Volumetric Intelligence ^& Spatial Topology Architecture
echo   Smart India Hackathon 2026 — PS26011 Prototype
echo =========================================================================
echo.

echo Starting GeoVISTA FastAPI Backend on http://localhost:8000 ...
start "GeoVISTA Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting GeoVISTA React Frontend on http://localhost:5173 ...
start "GeoVISTA Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo GeoVISTA is launching!
echo Backend Swagger API: http://localhost:8000/docs
echo Frontend Portal:     http://localhost:5173
echo =========================================================================
pause
