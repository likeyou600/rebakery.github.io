@echo off
setlocal EnableExtensions

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TIMESTAMP=%%i
for /f %%i in ('git branch --show-current') do set BRANCH=%%i

set MESSAGE=%*
if "%MESSAGE%"=="" set MESSAGE=update blog

if "%BRANCH%"=="" (
  echo [push] Could not detect current git branch.
  exit /b 1
)

echo [push] Running post checks...
call npm.cmd test
if errorlevel 1 (
  echo [push] npm test failed. Fix the issues above before pushing.
  exit /b 1
)

echo [push] Adding changes...
git add .
if errorlevel 1 exit /b 1

git diff --cached --quiet
if not errorlevel 1 (
  echo [push] No staged changes to commit.
) else (
  echo [push] Committing: %TIMESTAMP% %MESSAGE%
  git commit -m "%TIMESTAMP% %MESSAGE%"
  if errorlevel 1 exit /b 1
)

echo [push] Pushing branch %BRANCH%...
git push origin %BRANCH%
if errorlevel 1 exit /b 1

echo [push] Done.
