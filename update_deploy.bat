@echo off
setlocal

set REPO=likeyou600/rebakery.github.io
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TAG=update_%%i
for /f %%i in ('git branch --show-current') do set BRANCH=%%i

where gh >nul 2>nul
if errorlevel 1 (
  echo [deploy] GitHub CLI "gh" was not found.
  echo [deploy] Install it or run "winget install --id GitHub.cli".
  exit /b 1
)

if "%BRANCH%"=="" (
  echo [deploy] Could not detect current git branch.
  exit /b 1
)

for /f "delims=" %%i in ('git status --porcelain') do (
  echo [deploy] You have uncommitted changes.
  echo [deploy] Commit and push your changes before creating a deploy tag.
  exit /b 1
)

echo [deploy] Pushing branch %BRANCH%...
git push origin %BRANCH%
if errorlevel 1 exit /b 1

echo [deploy] Creating tag %TAG%...
git tag %TAG%
if errorlevel 1 exit /b 1

echo [deploy] Pushing tag %TAG%...
git push origin %TAG%
if errorlevel 1 exit /b 1

echo [deploy] Publishing GitHub Release %TAG%...
gh release create %TAG% --repo %REPO% --title "%TAG%" --notes "Publish blog updates"
if errorlevel 1 exit /b 1

echo [deploy] Done. GitHub Actions will run from the published release.
