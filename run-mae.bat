@echo off
title MAE Cualde — Tactical Interface
echo.
echo  =============================================
echo   MAE — Modular Adaptive Entity v1.0
echo   Doctrine v8.1a ^| Class: TRUTH
echo  =============================================
echo.

:: ── Verify Java ──────────────────────────────────────────────
java -version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Java not found. Install Java 21:
    echo  winget install EclipseAdoptium.Temurin.21.JDK
    echo.
    pause
    exit /b 1
)

:: ── Build if JAR is missing or sources are newer ─────────────
set JAR=%~dp0target\cualde-1.0.0.jar
if not exist "%JAR%" (
    echo  [BUILD] JAR not found. Building...
    echo.
    call mvn package -DskipTests -q
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  [ERROR] Build failed. Run: mvn package -DskipTests
        echo  Ensure Maven is installed: winget install Apache.Maven
        echo.
        pause
        exit /b 1
    )
    echo  [BUILD] Done.
    echo.
)

:: ── Launch ────────────────────────────────────────────────────
echo  Starting MAE Cualde on http://localhost:8080
echo  Press Ctrl+C to shut down.
echo.

java -jar "%JAR%" --spring.profiles.active=local
