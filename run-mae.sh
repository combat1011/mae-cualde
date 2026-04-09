#!/usr/bin/env bash
echo ""
echo "  ============================================="
echo "   MAE — Modular Adaptive Entity v1.0"
echo "   Doctrine v8.1a | Class: TRUTH"
echo "  ============================================="
echo ""
echo "  Starting MAE Cualde on http://localhost:8080"
echo "  Press Ctrl+C to shut down."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
java -jar "$SCRIPT_DIR/target/cualde-1.0.0.jar" --spring.profiles.active=local
