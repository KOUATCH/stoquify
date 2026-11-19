$ErrorActionPreference = 'Stop'
# Read-only host inspection. Never records command lines or changes a process/system setting.
$taskStorage = 'D:\p04-r06-fullapp-20261110-r3'
$taskOs = Get-CimInstance Win32_OperatingSystem
$taskComputer = Get-CimInstance Win32_ComputerSystem
$taskProcesses = @(Get-CimInstance Win32_Process)
$taskOwned = @($taskProcesses | Where-Object {
    $_.Name -in @('node.exe', 'postgres.exe') -and
    ($_.CommandLine -like '*p04-r06-fullapp-20261110-r3*' -or $_.CommandLine -like '*qualification-20261110-r3*')
} | Select-Object ProcessId, ParentProcessId, Name, CreationDate)
$taskApplications = @(Get-Process | Group-Object ProcessName | ForEach-Object {
    [pscustomobject]@{
        application = $_.Name
        processCount = $_.Count
        workingSetBytes = [long](($_.Group | Measure-Object WorkingSet64 -Sum).Sum)
        privateBytes = [long](($_.Group | Measure-Object PrivateMemorySize64 -Sum).Sum)
    }
} | Sort-Object privateBytes -Descending | Select-Object -First 15)
$taskDrives = @(Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Name -in @('C','D','E')} |
    ForEach-Object { [pscustomobject]@{drive=$_.Name;freeBytes=[long]$_.Free;usedBytes=[long]$_.Used} })
$taskPorts = @()
$taskPortError = $null
try {
    $taskPorts = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
        Where-Object {$_.LocalPort -in @(55516,55517,55518,3296,3297,3298,3299)} |
        Select-Object LocalAddress, LocalPort, OwningProcess)
} catch { $taskPortError = $_.Exception.Message }
[pscustomobject]@{
    capturedAt = [DateTime]::UtcNow.ToString('o')
    readOnly = $true
    storage = $taskStorage
    totalPhysicalBytes = [long]$taskComputer.TotalPhysicalMemory
    freePhysicalBytes = [long]$taskOs.FreePhysicalMemory * 1024
    totalCommitBytes = [long]$taskOs.TotalVirtualMemorySize * 1024
    freeCommitBytes = [long]$taskOs.FreeVirtualMemory * 1024
    pagefiles = @(Get-CimInstance Win32_PageFileUsage | Select-Object Name,AllocatedBaseSize,CurrentUsage,PeakUsage)
    drives = $taskDrives
    ownedProcesses = $taskOwned
    listeningPorts = $taskPorts
    portInspectionError = $taskPortError
    largestApplications = $taskApplications
    interpretation = 'Private-byte application totals are attribution only; free commit is the admission measure. No command lines, environment values or process termination.'
} | ConvertTo-Json -Depth 6 -Compress
