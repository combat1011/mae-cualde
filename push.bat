@echo off
cd /d "C:\Users\Steam Deck\Desktop\MAE\Cualde"

echo [GIT] Checking status...
git status

echo.
echo [GIT] Initializing repo...
git init

echo.
echo [GIT] Staging files...
git add .

echo.
echo [GIT] Committing...
git commit -m "feat: MAE Cualde v1.0 tactical interface"

echo.
echo [GIT] Adding remote...
git remote remove origin 2>nul
git remote add origin https://github.com/combat1011/mae-cualde.git

echo.
echo [GIT] Pushing to main...
git push -u origin main

echo.
echo [DONE] Push complete. Check above for errors.
pause
