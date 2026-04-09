@echo off
title MAE Cualde — Build Windows EXE
color 0A
echo.
echo  =============================================
echo   MAE — Building Windows Executable
echo   This may take 2-3 minutes...
echo  =============================================
echo.

:: Check Python
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python not found. Install Python 3.10+
    echo  winget install Python.Python.3.12
    pause
    exit /b 1
)

:: Install dependencies
echo  [1/3] Installing dependencies...
pip install flask requests pyinstaller -q 2>nul

:: Build EXE
echo  [2/3] Building MAE-Cualde.exe (this takes a minute)...
pyinstaller --onefile --name MAE-Cualde --icon NUL --add-data "mae-memory.json;." --noconsole --hidden-import=flask --hidden-import=requests "%~dp0mae_cualde.py" 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARN] Retrying with console window...
    pyinstaller --onefile --name MAE-Cualde --hidden-import=flask --hidden-import=requests "%~dp0mae_cualde.py"
)

:: Copy result
echo  [3/3] Copying to Desktop...
if exist "%~dp0dist\MAE-Cualde.exe" (
    copy "%~dp0dist\MAE-Cualde.exe" "%USERPROFILE%\Desktop\MAE-Cualde.exe" >nul
    echo.
    echo  =============================================
    echo   BUILD COMPLETE
    echo   MAE-Cualde.exe copied to Desktop
    echo   Double-click to run. No Python needed.
    echo  =============================================
) else (
    echo  [ERROR] Build failed. Check output above.
)
echo.
pause
