@echo off
setlocal
cd /d D:\ALKIM\IA\FRONTEND
echo === Reiniciando historial local de FRONTEND ===
rmdir /s /q .git
git init
git config user.email "info@alkim.es"
git config user.name "Alkim"
git checkout -b main
git remote add origin https://github.com/joaquim1965/ALKIM_FRONTEND.git
git add -A
git commit -m "chore: commit inicial limpio tras reorganizacion (NO_PROD, .gitignore)"
echo.
echo === Haciendo push a GitHub ===
git push -u origin main
echo.
echo === Resultado ===
git log --oneline -3
git remote -v
pause
