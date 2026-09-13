@echo off
chcp 65001 > nul
echo ===================================================
echo   LOGIN NO CHATGPT - CONTA 2
echo ===================================================
echo Abrindo o Chrome com perfil dedicado da Conta 2...
echo Apos logar e carregar a tela inicial, a sessao sera salva.
echo.
python -m src.main --setup-login --account 2
pause
