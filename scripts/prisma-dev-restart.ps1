$ErrorActionPreference = 'Stop'

function Get-DevCommandTokens([string]$CommandLine) {
    # Accept ordinary Windows Node command lines; refuse embedded/unbalanced quotes.
    if ($CommandLine -notmatch '^\s*(?:"[^"]*"|[^\s"]+)(?:\s+(?:"[^"]*"|[^\s"]+))*\s*$') {
        throw 'Unrecognized Node command line; no processes were stopped.'
    }
    @([regex]::Matches($CommandLine, '"([^"]*)"|([^\s"]+)') | ForEach-Object {
        if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value }
    })
}

function Find-DevRestartPlans($Root, $Processes, $Listeners) {
    $serverFile = Join-Path $Root 'node_modules\next\dist\server\lib\start-server.js'
    $servers = @($Processes | Where-Object {
        $line = $_.CommandLine
        $line -and $line -match ('^\s*(?:"[^"]+"|\S+)\s+"' + [regex]::Escape($serverFile) + '"\s*$')
    })
    $plans = [Collections.Generic.List[object]]::new()
    foreach ($server in $servers) {
        $launchers = @($Processes | Where-Object ProcessId -eq $server.ParentProcessId)
        if ($launchers.Count -ne 1) { throw 'Cannot verify the dev launcher; no processes were stopped.' }
        $launcher = $launchers[0]
        $tokens = @(Get-DevCommandTokens $launcher.CommandLine)
        if ($tokens.Count -lt 2) { throw 'Cannot verify the dev launcher; no processes were stopped.' }
        $launcherFile = if ([IO.Path]::IsPathRooted($tokens[1])) {
            [IO.Path]::GetFullPath($tokens[1])
        } else {
            [IO.Path]::GetFullPath((Join-Path $Root $tokens[1]))
        }
        if ($launcherFile -ne (Join-Path $Root 'scripts\dev-app-safe.js')) {
            throw 'The Next process was not started by this project''s dev command; no processes were stopped.'
        }
        $turbo = $false
        for ($i = 2; $i -lt $tokens.Count; $i++) {
            switch -CaseSensitive ($tokens[$i]) {
                { $_ -in @('--turbopack', '--turbo') } { $turbo = $true }
                { $_ -in @('--port', '-p', '--hostname', '-H') } {
                    $i++
                    if ($i -ge $tokens.Count) { throw 'Incomplete dev arguments; no processes were stopped.' }
                }
                default { throw "Unsupported dev argument '$($tokens[$i])'; no processes were stopped." }
            }
        }
        $bindings = @($Listeners | Where-Object OwningProcess -eq $server.ProcessId)
        if ($bindings.Count -ne 1) {
            throw 'Cannot determine a single listening address for the dev server. Wait for it to be ready, then retry.'
        }
        $plans.Add(@{
            Server = $server
            Launcher = $launcher
            Port = [string]$bindings[0].LocalPort
            Hostname = [string]$bindings[0].LocalAddress
            Turbo = $turbo
        })
    }
    # Emit only after every server is validated; an unsafe later entry aborts the batch.
    $plans.ToArray()
}

function Get-DevRestartPlans($Root) {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")
    # Read listeners before making any changes. Access errors fail closed.
    $listeners = @(Get-NetTCPConnection -State Listen)
    Find-DevRestartPlans $Root $processes $listeners
}

function Assert-DevProcessIdentity($Expected) {
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($Expected.ProcessId)"
    if (!$current -or $current.Name -ne 'node.exe' -or
        $current.CreationDate -ne $Expected.CreationDate -or
        $current.CommandLine -ne $Expected.CommandLine -or
        $current.ParentProcessId -ne $Expected.ParentProcessId) {
        throw "Process $($Expected.ProcessId) changed since inspection; refusing to stop it."
    }
}

function Stop-VerifiedDevServer($Plan) {
    # Pin OS handles before rechecking identities, so a reused PID cannot be killed.
    $launcherHandle = Get-Process -Id $Plan.Launcher.ProcessId
    $serverHandle = Get-Process -Id $Plan.Server.ProcessId
    try {
        $null = $launcherHandle.Handle
        $null = $serverHandle.Handle
        Assert-DevProcessIdentity $Plan.Launcher
        Assert-DevProcessIdentity $Plan.Server
        Write-Host "Stopping this checkout's dev server on port $($Plan.Port)..."
        $launcherHandle.Kill()
        if (!$launcherHandle.WaitForExit(10000)) { throw 'Dev launcher did not exit; generation cancelled.' }
        if (!$serverHandle.HasExited) { $serverHandle.Kill() }
        if (!$serverHandle.WaitForExit(10000)) { throw 'Dev server did not exit; generation cancelled.' }
    } finally {
        $launcherHandle.Dispose()
        $serverHandle.Dispose()
    }
}

function Invoke-PrismaGeneration($Root, $NodePath) {
    Write-Host 'Generating Prisma Client (no database migrations)...'
    & $NodePath (Join-Path $Root 'node_modules\prisma\build\index.js') generate | Out-Host
    return $LASTEXITCODE
}

function Test-DevBindingsOverlap($Left, $Right) {
    $a = [Net.IPAddress]::Parse($Left)
    $b = [Net.IPAddress]::Parse($Right)
    if ($a.IsIPv4MappedToIPv6) { $a = $a.MapToIPv4() }
    if ($b.IsIPv4MappedToIPv6) { $b = $b.MapToIPv4() }
    # Next's IPv6 wildcard listener also reserves IPv4 by default.
    if ($a.Equals($b) -or $a.Equals([Net.IPAddress]::IPv6Any) -or $b.Equals([Net.IPAddress]::IPv6Any)) { return $true }
    return $a.AddressFamily -eq $b.AddressFamily -and
        ($a.Equals([Net.IPAddress]::Any) -or $b.Equals([Net.IPAddress]::Any))
}

function Find-DevPortConflicts($Root, $Plan, $Processes, $Listeners) {
    $bindings = @($Listeners | Where-Object {
        $_.LocalPort -eq $Plan.Port -and (Test-DevBindingsOverlap $_.LocalAddress $Plan.Hostname)
    })
    $conflicts = [Collections.Generic.List[object]]::new()
    foreach ($owner in @($bindings.OwningProcess | Select-Object -Unique)) {
        $servers = @($Processes | Where-Object ProcessId -eq $owner)
        $message = "Port $($Plan.Port) is occupied by PID $owner, which cannot be verified as this checkout's dev server; it was left running."
        if ($servers.Count -ne 1) { throw $message }
        $family = @($Processes | Where-Object {
            $_.ProcessId -eq $owner -or $_.ProcessId -eq $servers[0].ParentProcessId
        })
        try { $verified = @(Find-DevRestartPlans $Root $family $Listeners) }
        catch { throw "$message $_" }
        if ($verified.Count -ne 1 -or $verified[0].Server.ProcessId -ne $owner) { throw $message }
        $conflicts.Add($verified[0])
    }
    # Validate every conflicting owner before allowing any termination.
    $conflicts.ToArray()
}

function Get-DevPortConflicts($Root, $Plan) {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'")
    $listeners = @(Get-NetTCPConnection -State Listen)
    Find-DevPortConflicts $Root $Plan $processes $listeners
}

function Resolve-DevPortConflict($Root, $Plan) {
    $conflicts = @(Get-DevPortConflicts $Root $Plan)
    foreach ($conflict in $conflicts) {
        Assert-DevProcessIdentity $conflict.Launcher
        Assert-DevProcessIdentity $conflict.Server
    }
    foreach ($conflict in $conflicts) {
        Write-Host "Reclaiming port $($Plan.Port) from another verified dev server in this checkout..."
        Stop-VerifiedDevServer $conflict
    }
}

function Start-PrismaDevServer($Root, $NodePath, $Plan, $LogDirectory, $Index, $Attempt = 1) {
    $arguments = @('"' + (Join-Path $Root 'scripts\dev-app-safe.js') + '"')
    $label = 'default'
    if ($Plan) {
        Resolve-DevPortConflict $Root $Plan
        $arguments += @('--port', $Plan.Port, '--hostname', $Plan.Hostname)
        if ($Plan.Turbo) { $arguments += '--turbopack' }
        $label = $Plan.Port
    }
    $stdout = Join-Path $LogDirectory "server-$Index-$label-attempt-$Attempt.stdout.log"
    $stderr = Join-Path $LogDirectory "server-$Index-$label-attempt-$Attempt.stderr.log"
    $process = Start-Process -FilePath $NodePath -ArgumentList $arguments -WorkingDirectory $Root `
        -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Write-Host "Started dev launcher $($process.Id) (port $label). Logs: $stdout ; $stderr"
    @{
        Process = $process; Port = $label; Stdout = $stdout; Stderr = $stderr
        Root = $Root; NodePath = $NodePath; Plan = $Plan; LogDirectory = $LogDirectory
        Index = $Index; Attempt = $Attempt
    }
}

function Wait-PrismaDevServers($Started, $TimeoutSeconds = 180) {
    $pending = [Collections.Generic.List[object]]::new()
    foreach ($entry in $Started) { $pending.Add($entry) }
    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $failed = $false
    while ($pending.Count -and [DateTime]::UtcNow -lt $deadline) {
        foreach ($entry in @($pending.ToArray())) {
            $entry.Process.Refresh()
            if ($entry.Process.HasExited) {
                if ($entry.Plan -and $entry.Attempt -lt 3 -and
                    (Select-String -LiteralPath $entry.Stderr -Pattern 'EADDRINUSE' -Quiet)) {
                    try {
                        Write-Host "Port $($entry.Port) was claimed during startup; checking ownership and retrying (attempt $($entry.Attempt + 1)/3)..."
                        $replacement = Start-PrismaDevServer $entry.Root $entry.NodePath $entry.Plan $entry.LogDirectory $entry.Index ($entry.Attempt + 1)
                        $entry.Process.Dispose()
                        # Keep the shared entry so cleanup disposes the latest handle.
                        foreach ($key in $replacement.Keys) { $entry[$key] = $replacement[$key] }
                        continue
                    } catch {
                        Write-Host "Could not recover port $($entry.Port): $_"
                    }
                }
                Write-Host "Dev server for port $($entry.Port) exited before ready. See $($entry.Stderr)"
                $failed = $true
                $null = $pending.Remove($entry)
            } elseif (Select-String -LiteralPath $entry.Stdout -Pattern 'Ready in ' -Quiet) {
                Write-Host "Dev server ready on port $($entry.Port)."
                $null = $pending.Remove($entry)
            }
        }
        if ($pending.Count) { Start-Sleep -Milliseconds 500 }
    }
    foreach ($entry in $pending) {
        Write-Host "Timed out waiting for port $($entry.Port). The process was left running; see $($entry.Stdout) and $($entry.Stderr)"
        $failed = $true
    }
    if ($failed) { return 1 }
    return 0
}

function Start-PrismaDevServers($Root, $NodePath, $Plans) {
    $logDirectory = Join-Path $Root ('.next-prisma-restart-' + [guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $logDirectory
    $started = [Collections.Generic.List[object]]::new()
    $failed = $false
    # With no previous server, retain the existing normal-dev-default behavior.
    $targets = @($Plans)
    if (!$targets.Count) { $targets = @($null) }
    try {
        for ($i = 0; $i -lt $targets.Count; $i++) {
            try {
                $started.Add((Start-PrismaDevServer $Root $NodePath $targets[$i] $logDirectory $i))
            } catch {
                Write-Host "Could not start dev server for port $($targets[$i].Port): $_"
                $failed = $true
            }
        }
        $result = Wait-PrismaDevServers $started.ToArray()
        if ($failed -or $result -ne 0) { return 1 }
        Write-Host 'All dev servers are ready and running in the background.'
        return 0
    } finally {
        foreach ($entry in $started) { $entry.Process.Dispose() }
    }
}

function Get-PrismaNodePath {
    # PATH can expose both system Node and a bundled Codex runtime.
    (Get-Command node -CommandType Application | Select-Object -First 1).Source
}

function Invoke-PrismaDevRestart($Root, $NodePath) {
    $plans = @(Get-DevRestartPlans $Root)
    # Validate the complete batch again before stopping the first server.
    foreach ($plan in $plans) {
        Assert-DevProcessIdentity $plan.Launcher
        Assert-DevProcessIdentity $plan.Server
    }
    foreach ($plan in $plans) { Stop-VerifiedDevServer $plan }
    if (!$plans.Count) {
        Write-Host 'No running dev server found for this checkout; using normal dev defaults.'
    }
    $result = Invoke-PrismaGeneration $Root $NodePath
    if ($result -ne 0) {
        Write-Host 'Prisma generation failed; no dev servers were restarted. Close any Prisma Studio or other process using this client, then retry npm run prisma:restart.'
        return $result
    }
    Start-PrismaDevServers $Root $NodePath $plans
}

# Dot-sourcing exposes the functions for isolated tests without operating on processes.
if ($MyInvocation.InvocationName -ne '.') {
    $root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    Push-Location -LiteralPath $root
    try {
        $nodePath = Get-PrismaNodePath
        exit (Invoke-PrismaDevRestart $root $nodePath)
    } catch {
        Write-Error $_ -ErrorAction Continue
        exit 1
    } finally {
        Pop-Location
    }
}
