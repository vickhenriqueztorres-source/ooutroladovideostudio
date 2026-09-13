@echo off
chcp 65001 > nul
echo ===================================================
echo   LOGIN NO CHATGPT - CONTA 3
echo ===================================================
echo Abrindo o Chrome com perfil dedicado da Conta 3...
echo Apos logar e carregar a tela inicial, a sessao sera salva.
echo.
python -m src.main --setup-login --account 3
pause
