$ErrorActionPreference = 'Stop'
$taskBase = $PSScriptRoot
$taskRuntime = Get-Content -LiteralPath (Join-Path $taskBase 'runtime-context.json') -Raw | ConvertFrom-Json
$taskBrowser = Get-Content -LiteralPath (Join-Path $taskBase 'browser-results.json') -Raw | ConvertFrom-Json
if ($taskBrowser.status -ne 'PASS_SCOPED' -or -not $taskBrowser.cleanupComplete) { throw 'Final browser pass and cleanup required' }
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskRuntime.launcherPid)"
if (-not $taskProcess -or $taskProcess.CommandLine -notlike '*development-10/serve.cjs*') { throw 'Owned Next launcher not verified' }
taskkill /PID $taskRuntime.launcherPid /T /F > (Join-Path $taskBase 'next-shutdown.log') 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Owned Next shutdown failed' }
& 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe' -D 'C:/Users/J COMPUTER/.codex/visualizations/2026/10/24/01a16e07-5033-74f0-a987-8d57c6717085/hris-postgres-20261024' -m fast -w stop > (Join-Path $taskBase 'postgres-shutdown.log') 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Owned PostgreSQL shutdown failed' }
$taskListeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(35586,55464) })
if ($taskListeners.Count -ne 0) { throw 'Owned test port remains open' }
[ordered]@{status='PASS';nextStopped=$true;postgresStopped=$true;nextLauncherVerified=$true;launcherPid=$taskRuntime.launcherPid;portsClosed=@(35586,55464);verifiedAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskBase 'shutdown.json')
