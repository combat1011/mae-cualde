#!/usr/bin/env bash
set -e
echo ""
echo "  ============================================="
echo "   MAE — Modular Adaptive Entity v1.0"
echo "   Python Edition — Doctrine v8.1a"
echo "  ============================================="
echo ""
pip3 install flask requests -q 2>/dev/null
echo "  Starting MAE on http://localhost:8080"
echo "  Press Ctrl+C to shut down."
echo ""
python3 "$(dirname "$0")/mae_cualde.py"
