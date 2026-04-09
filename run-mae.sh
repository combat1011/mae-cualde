#!/usr/bin/env bash
set -e

echo ""
echo "  ============================================="
echo "   MAE — Modular Adaptive Entity v1.0"
echo "   Doctrine v8.1a | Class: TRUTH"
echo "  ============================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JAR="$SCRIPT_DIR/target/cualde-1.0.0.jar"

# ── Verify Java ──────────────────────────────────────────────
if ! command -v java &>/dev/null; then
    echo "  [ERROR] Java not found. Install Java 21."
    echo "  macOS:  brew install --cask temurin@21"
    echo "  Linux:  sudo apt install openjdk-21-jdk"
    exit 1
fi

# ── Build if JAR is missing ──────────────────────────────────
if [ ! -f "$JAR" ]; then
    echo "  [BUILD] JAR not found. Building..."
    if ! command -v mvn &>/dev/null; then
        echo "  [ERROR] Maven not found. Install Maven 3.9+."
        echo "  macOS:  brew install maven"
        echo "  Linux:  sudo apt install maven"
        exit 1
    fi
    mvn package -DskipTests -q -f "$SCRIPT_DIR/pom.xml"
    echo "  [BUILD] Done."
    echo ""
fi

# ── Launch ───────────────────────────────────────────────────
echo "  Starting MAE Cualde on http://localhost:8080"
echo "  Press Ctrl+C to shut down."
echo ""

java -jar "$JAR" --spring.profiles.active=local
