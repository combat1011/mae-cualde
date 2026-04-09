@echo off
title MAE Cualde — Tactical Interface
echo.
echo  =============================================
echo   MAE — Modular Adaptive Entity v1.0
echo   Doctrine v8.1a ^| Class: TRUTH
echo  =============================================
echo.
echo  Starting MAE Cualde on http://localhost:8080
echo  Press Ctrl+C to shut down.
echo.

java -jar "%~dp0target\cualde-1.0.0.jar" --spring.profiles.active=local

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Java not found. Install Java 21:
    echo  winget install EclipseAdoptium.Temurin.21.JDK
    echo.
    pause
)
