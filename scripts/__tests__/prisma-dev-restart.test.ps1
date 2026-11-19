$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\prisma-dev-restart.ps1')

function Assert($Condition, $Message) {
    if (!$Condition) { throw $Message }
}
function Assert-Throws($Action, $Pattern) {
    $caught = $null
    try { & $Action } catch { $caught = $_ }
    Assert ($null -ne $caught -and $caught.ToString() -match $Pattern) "Expected error: $Pattern"
}

$root = 'C:\fixture with spaces\stoquify'
$launcher = [pscustomobject]@{
    Name = 'node.exe'; ProcessId = 10; ParentProcessId = 1; CreationDate = 'original'
    CommandLine = '"C:\Program Files\nodejs\node.exe" scripts/dev-app-safe.js --port 3101 --hostname 127.0.0.1 --turbopack'
}
$server = [pscustomobject]@{
    Name = 'node.exe'; ProcessId = 11; ParentProcessId = 10; CreationDate = 'original'
    CommandLine = '"C:\Program Files\nodejs\node.exe" "C:\fixture with spaces\stoquify\node_modules\next\dist\server\lib\start-server.js"'
}
$binding = [pscustomobject]@{ OwningProcess = 11; LocalPort = 3101; LocalAddress = '127.0.0.1' }
$plan = Find-DevRestartPlans $root @($launcher, $server) @($binding)
Assert ($plan.Port -eq '3101' -and $plan.Hostname -eq '127.0.0.1' -and $plan.Turbo) 'Must preserve port, binding and bundler.'
Assert (@(Find-DevRestartPlans 'C:\another-checkout' @($launcher, $server) @($binding)).Count -eq 0) 'Must ignore other checkouts.'
Assert (@(Find-DevRestartPlans $root @() @()).Count -eq 0) 'Must support no running server.'
Assert-Throws { Find-DevRestartPlans $root @($launcher, $server) @() } 'single listening address'
Assert-Throws { Find-DevRestartPlans $root @($server) @($binding) } 'verify the dev launcher'
$launcher2 = [pscustomobject]@{
    Name='node.exe'; ProcessId=20; ParentProcessId=1; CreationDate='original'
    CommandLine='"node.exe" scripts/dev-app-safe.js --port 3046'
}
$server2 = [pscustomobject]@{
    Name='node.exe'; ProcessId=21; ParentProcessId=20; CreationDate='original'; CommandLine=$server.CommandLine
}
$binding2 = [pscustomobject]@{OwningProcess=21; LocalPort=3046; LocalAddress='::'}
$plans = @(Find-DevRestartPlans $root @($launcher,$server,$launcher2,$server2) @($binding,$binding2))
Assert ($plans.Count -eq 2 -and $plans[1].Port -eq '3046' -and $plans[1].Hostname -eq '::' -and !$plans[1].Turbo) 'Must preserve distinct settings for all servers.'
$script:emitted = [Collections.Generic.List[object]]::new()
Assert-Throws {
    Find-DevRestartPlans $root @($launcher,$server,$server2) @($binding,$binding2) | ForEach-Object { $script:emitted.Add($_) }
} 'verify the dev launcher'
Assert ($script:emitted.Count -eq 0) 'Must not emit a partial plan when a later server is unsafe.'

$originalCommand = $launcher.CommandLine
$launcher.CommandLine = '"node.exe" node_modules/next/dist/bin/next start'
Assert-Throws { Find-DevRestartPlans $root @($launcher, $server) @($binding) } 'not started by'
$launcher.CommandLine = $originalCommand + ' --experimental-https'
Assert-Throws { Find-DevRestartPlans $root @($launcher, $server) @($binding) } 'Unsupported dev argument'
$launcher.CommandLine = '"node.exe" "C:\fixture with spaces\stoquify\scripts\dev-app-safe.js"'
Assert ($null -ne (Find-DevRestartPlans $root @($launcher, $server) @($binding))) 'Absolute launcher paths must work.'
$launcher.CommandLine = $originalCommand
Assert-Throws { Get-DevCommandTokens '"node.exe" "unterminated' } 'Unrecognized Node command'

Assert (Test-DevBindingsOverlap '::' '127.0.0.1') 'IPv6 wildcard must cover IPv4.'
Assert (Test-DevBindingsOverlap '0.0.0.0' '127.0.0.1') 'IPv4 wildcard must cover loopback.'
Assert (Test-DevBindingsOverlap '::ffff:127.0.0.1' '127.0.0.1') 'Mapped IPv4 addresses must match.'
Assert (!(Test-DevBindingsOverlap '127.0.0.1' '127.0.0.2')) 'Distinct explicit bindings must not conflict.'
Assert (!(Test-DevBindingsOverlap '::1' '0.0.0.0')) 'IPv4 wildcard must not cover IPv6 loopback.'
$conflicts = @(Find-DevPortConflicts $root $plan @($launcher,$server,$launcher2,$server2) @($binding,$binding2))
Assert ($conflicts.Count -eq 1 -and $conflicts[0].Server.ProcessId -eq 11) 'Only matching ports may be reclaimed.'
Assert (@(Find-DevPortConflicts $root $plan @() @()).Count -eq 0) 'Free ports need no termination.'
Assert-Throws { Find-DevPortConflicts 'C:\another-checkout' $plan @($launcher,$server) @($binding) } 'left running'
$launcher.CommandLine = '"node.exe" node_modules/next/dist/bin/next start'
Assert-Throws { Find-DevPortConflicts $root $plan @($launcher,$server) @($binding) } 'left running'
$launcher.CommandLine = $originalCommand
$unknownBinding = [pscustomobject]@{ OwningProcess=999;LocalPort=3101;LocalAddress='::' }
$script:emitted.Clear()
Assert-Throws {
    Find-DevPortConflicts $root $plan @($launcher,$server) @($binding,$unknownBinding) |
        ForEach-Object { $script:emitted.Add($_) }
} 'PID 999'
Assert ($script:emitted.Count -eq 0) 'An unknown owner must prevent partial conflict resolution.'

# Mock all OS/application operations below: no process termination, DB, or server startup.
function Get-Command {
    @([pscustomobject]@{Source='C:\Program Files\nodejs\node.exe'}, [pscustomobject]@{Source='C:\bundled\node.exe'})
}
Assert ((Get-PrismaNodePath) -eq 'C:\Program Files\nodejs\node.exe') 'Must choose one Node executable when PATH exposes multiple runtimes.'
function Get-CimInstance { $script:identity }
$script:identity = $launcher
Assert-DevProcessIdentity $launcher
$script:identity = [pscustomobject]@{
    Name = 'node.exe'; ProcessId = 10; ParentProcessId = 1
    CreationDate = 'reused-pid'; CommandLine = $launcher.CommandLine
}
Assert-Throws { Assert-DevProcessIdentity $launcher } 'changed since inspection'

# Exercise conflict handling with in-memory identities and stop events.
$script:conflicts = @($plan)
$script:conflictEvents = [Collections.Generic.List[string]]::new()
$script:conflictIdentityFails = 0
$script:conflictLookupFails = $false
function Get-DevPortConflicts {
    if ($script:conflictLookupFails) { throw 'Unrelated port owner; left running.' }
    $script:conflicts
}
function Assert-DevProcessIdentity {
    param($Expected)
    $script:conflictEvents.Add("verify:$($Expected.ProcessId)")
    if ($Expected.ProcessId -eq $script:conflictIdentityFails) { throw 'identity changed' }
}
function Stop-VerifiedDevServer {
    param($Plan)
    $script:conflictEvents.Add("stop:$($Plan.Port)")
}
Resolve-DevPortConflict $root $plan
Assert (($script:conflictEvents -join ',') -eq 'verify:10,verify:11,stop:3101') 'Must verify both identities before reclaiming.'
$script:conflictEvents.Clear()
$script:conflictIdentityFails = 11
Assert-Throws { Resolve-DevPortConflict $root $plan } 'identity changed'
Assert (!$script:conflictEvents.Contains('stop:3101')) 'Changed identity must prevent termination.'
$script:conflictIdentityFails = 0
$script:conflicts = @()

# Exercise actual launch argument construction and readiness handling, mocking OS/files.
function New-Item {}
function Start-Process {
    param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle,$RedirectStandardOutput,$RedirectStandardError,[switch]$PassThru)
    $script:launches.Add(@{Args=$ArgumentList;Window=$WindowStyle;Stdout=$RedirectStandardOutput;Stderr=$RedirectStandardError})
    if ($script:launches.Count -eq $script:failedLaunch) { throw 'spawn failed' }
    $process = [pscustomobject]@{Id=100+$script:launches.Count;HasExited=($script:launches.Count -le $script:exitingLaunches)}
    $process | Add-Member ScriptMethod Refresh {}
    $process | Add-Member ScriptMethod Dispose {}
    return $process
}
function Select-String {
    param($LiteralPath,$Pattern,[switch]$Quiet)
    if ($Pattern -eq 'EADDRINUSE') { return $script:addressInUse }
    return $true
}
function Start-Sleep {}
$script:launches = [Collections.Generic.List[object]]::new()
$script:failedLaunch = 0
$script:exitingLaunches = 0
$script:addressInUse = $false
$script:conflicts = @($plan)
$script:conflictEvents.Clear()
$started = Start-PrismaDevServer $root 'node.exe' $plans[0] $root 0
Assert ($script:conflictEvents.Contains('stop:3101')) 'Launch must reclaim a verified occupied port first.'
$script:conflicts = @()
Assert (($script:launches[0].Args -join ' ') -eq '"C:\fixture with spaces\stoquify\scripts\dev-app-safe.js" --port 3101 --hostname 127.0.0.1 --turbopack') 'Must quote the script path and retain each launch setting.'
Assert ($script:launches[0].Window -eq 'Hidden') 'Background servers must not open windows.'
Assert ((Wait-PrismaDevServers @($started)) -eq 0) 'Ready server must succeed.'
$started.Process.HasExited = $true
Assert ((Wait-PrismaDevServers @($started)) -eq 1) 'Exit before ready must fail.'
$started.Process.HasExited = $false
Assert ((Wait-PrismaDevServers @($started) 0) -eq 1) 'Readiness timeout must fail.'
$script:launches.Clear()
Assert ((Start-PrismaDevServers $root 'node.exe' $plans) -eq 0) 'All servers must start before waiting.'
Assert ($script:launches.Count -eq 2 -and ($script:launches[1].Args -join ' ') -match '--port 3046 --hostname ::$') 'Must launch the second server with its original settings.'
Assert ($script:launches[0].Stdout -ne $script:launches[1].Stdout) 'Servers must have separate logs.'
$script:launches.Clear()
$script:failedLaunch = 1
Assert ((Start-PrismaDevServers $root 'node.exe' $plans) -eq 1) 'Partial spawn failure must return nonzero.'
Assert ($script:launches.Count -eq 2) 'Must attempt remaining restarts after one spawn fails.'
$script:failedLaunch = 0
$script:launches.Clear()
Assert ((Start-PrismaDevServers $root 'node.exe' @()) -eq 0) 'An empty server list must launch one default dev server.'
Assert ($script:launches.Count -eq 1 -and $script:launches[0].Args.Count -eq 1) 'Default launch must not add saved port or bundler arguments.'

$script:launches.Clear()
$script:exitingLaunches = 1
$script:addressInUse = $true
$started = Start-PrismaDevServer $root 'node.exe' $plan $root 0
$script:conflicts = @($plan)
$script:conflictEvents.Clear()
Assert ((Wait-PrismaDevServers @($started)) -eq 0) 'A startup port race must recover.'
Assert ($script:conflictEvents.Contains('stop:3101')) 'Retry must recheck and reclaim the port.'
Assert ($started.Attempt -eq 2 -and $script:launches.Count -eq 2) 'Successful retry must update the tracked handle.'
Assert (($script:launches[0].Args -join ' ') -eq ($script:launches[1].Args -join ' ')) 'Retry must preserve original port, address and bundler.'
Assert ($script:launches[0].Stderr -ne $script:launches[1].Stderr) 'Retry must preserve prior diagnostic logs.'
$script:conflicts = @()
$script:launches.Clear()
$script:exitingLaunches = 99
$started = Start-PrismaDevServer $root 'node.exe' $plan $root 0
Assert ((Wait-PrismaDevServers @($started)) -eq 1) 'Persistent contention must fail rather than loop indefinitely.'
Assert ($script:launches.Count -eq 3) 'Retry budget must be three launches total.'
$script:launches.Clear()
$started = Start-PrismaDevServer $root 'node.exe' $plan $root 0
$script:conflictLookupFails = $true
Assert ((Wait-PrismaDevServers @($started)) -eq 1) 'An unrelated owner during retry must remain protected.'
Assert ($script:launches.Count -eq 1) 'Unsafe port ownership must prevent relaunch.'
$script:conflictLookupFails = $false
$script:addressInUse = $false
$script:launches.Clear()
$started = Start-PrismaDevServer $root 'node.exe' $plan $root 0
Assert ((Wait-PrismaDevServers @($started)) -eq 1) 'Non-port errors must remain failures.'
Assert ($script:launches.Count -eq 1) 'Non-port errors must not trigger retries.'

function Get-DevRestartPlans { $script:mockPlans }
function Assert-DevProcessIdentity {
    param($Expected)
    $script:events.Add("verify:$($Expected.ProcessId)")
    if ($Expected.ProcessId -eq $script:identityFails) { throw 'identity changed' }
}
function Stop-VerifiedDevServer {
    param($Plan)
    $script:events.Add("stop:$($Plan.Port)")
    if ($Plan.Port -eq $script:stopFails) { throw 'stop failed' }
}
function Invoke-PrismaGeneration { $script:events.Add('generate'); return $script:generateResult }
function Start-PrismaDevServers {
    param($Root, $NodePath, $Plans)
    $script:events.Add('start')
    $script:restartPlans = @($Plans)
    return $script:restartResult
}
$script:mockPlans = $plans
$script:generateResult = 0
$script:stopFails = ''
$script:identityFails = 0
$script:restartResult = 0
$script:events = [Collections.Generic.List[string]]::new()
Assert ((Invoke-PrismaDevRestart $root 'node.exe') -eq 0) 'Successful lifecycle must return zero.'
Assert (($script:events -join ',') -eq 'verify:10,verify:11,verify:20,verify:21,stop:3101,stop:3046,generate,start') 'Must verify all, stop all, generate exactly once, and only then restart.'
Assert ($script:restartPlans.Count -eq 2 -and $script:restartPlans[0].Turbo -and $script:restartPlans[1].Port -eq '3046') 'Must forward every saved plan.'
$script:events.Clear()
$script:generateResult = 7
Assert ((Invoke-PrismaDevRestart $root 'node.exe') -eq 7) 'Must propagate generation exit code.'
Assert (($script:events -join ',') -eq 'verify:10,verify:11,verify:20,verify:21,stop:3101,stop:3046,generate') 'Must not restart after generation failure.'
$script:events.Clear()
$script:stopFails = '3046'
Assert-Throws { Invoke-PrismaDevRestart $root 'node.exe' } 'stop failed'
Assert (!$script:events.Contains('generate') -and !$script:events.Contains('start')) 'Must not generate or restart after any stop failure.'
$script:events.Clear()
$script:stopFails = ''
$script:identityFails = 21
Assert-Throws { Invoke-PrismaDevRestart $root 'node.exe' } 'identity changed'
Assert (($script:events -join ',') -eq 'verify:10,verify:11,verify:20,verify:21') 'A changed last identity must prevent all stops.'
$script:identityFails = 0
$script:generateResult = 0
$script:restartResult = 1
Assert ((Invoke-PrismaDevRestart $root 'node.exe') -eq 1) 'Must propagate a restart failure.'
$script:events.Clear()
$script:restartResult = 0
$script:mockPlans = @()
Assert ((Invoke-PrismaDevRestart $root 'node.exe') -eq 0) 'No-server lifecycle must succeed.'
Assert (($script:events -join ',') -eq 'generate,start') 'No-server lifecycle must not stop processes.'
Assert ($script:restartPlans.Count -eq 0) 'No-server lifecycle must use normal defaults.'
Write-Host 'Prisma restart tests passed (multiple servers, ownership, settings, launch/readiness, sequencing and failure paths).'
