$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverProcess = $null

function Stop-HexoServer {
    if ($null -eq $script:serverProcess -or $script:serverProcess.HasExited) {
        return
    }

    Write-Host ""
    Write-Host "[dev] Restarting Hexo server..."
    taskkill.exe /PID $script:serverProcess.Id /T /F | Out-Null
    $script:serverProcess.WaitForExit()
}

function Start-HexoServer {
    Push-Location $root
    try {
        npm.cmd run clean
        $script:serverProcess = Start-Process -FilePath 'npm.cmd' `
            -ArgumentList @('run', 'server') `
            -WorkingDirectory $root `
            -NoNewWindow `
            -PassThru
    }
    finally {
        Pop-Location
    }
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $root
$watcher.Filter = '_config*.yml'
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, Size'
$watcher.EnableRaisingEvents = $true

$eventNames = @('Changed', 'Created', 'Deleted', 'Renamed')
foreach ($eventName in $eventNames) {
    Register-ObjectEvent -InputObject $watcher -EventName $eventName -SourceIdentifier "HexoConfig$eventName" | Out-Null
}

try {
    Write-Host "[dev] Watching _config*.yml. Press Ctrl+C to stop."
    Start-HexoServer

    while ($true) {
        $event = Wait-Event -Timeout 1
        if ($null -eq $event) {
            if ($null -ne $serverProcess -and $serverProcess.HasExited) {
                break
            }
            continue
        }

        Remove-Event -EventIdentifier $event.EventIdentifier
        Start-Sleep -Milliseconds 400

        while ($pending = Wait-Event -Timeout 0) {
            Remove-Event -EventIdentifier $pending.EventIdentifier
        }

        Stop-HexoServer
        Start-HexoServer
    }
}
finally {
    Stop-HexoServer
    foreach ($eventName in $eventNames) {
        Unregister-Event -SourceIdentifier "HexoConfig$eventName" -ErrorAction SilentlyContinue
    }
    $watcher.Dispose()
}
