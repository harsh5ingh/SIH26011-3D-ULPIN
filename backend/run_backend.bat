@echo off
echo Starting GeoVISTA FastAPI Backend Server on http://localhost:8000 ...
cd /d "%~dp0"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
