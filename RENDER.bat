@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org lalu jalankan lagi. & pause & exit /b 1)
node scripts\menu.mjs %*
pause
