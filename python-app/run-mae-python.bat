@echo off
title MAE Cualde — Python Edition
color 0A
echo.
echo  =============================================
echo   MAE — Modular Adaptive Entity v1.0
echo   Python Edition — Doctrine v8.1a
echo  =============================================
echo.
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python not found. Install Python 3.10+
    echo  winget install Python.Python.3.12
    pause
    exit /b 1
)
pip install flask requests -q 2>nul
echo  Starting MAE on http://localhost:8080
echo  Press Ctrl+C to shut down.
echo.
python "%~dp0mae_cualde.py"
