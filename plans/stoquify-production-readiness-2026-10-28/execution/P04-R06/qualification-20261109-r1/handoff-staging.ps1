$ErrorActionPreference = 'Stop'
$outputDirectory = $PSScriptRoot
$expectedCommand = '"C:\Program Files\nodejs\node.exe" plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1/stage-dependencies.cjs'
$expectedCreated = [DateTimeOffset]::Parse('2026-11-09T20:16:54.132452+01:00')
$ownedProcess = Get-CimInstance Win32_Process -Filter 'ProcessId = 3764'
if ($null -eq $ownedProcess -or $ownedProcess.ExecutablePath -cne 'C:\Program Files\nodejs\node.exe' -or $ownedProcess.CommandLine -cne $expectedCommand -or ([DateTimeOffset]$ownedProcess.CreationDate).UtcDateTime -ne $expectedCreated.UtcDateTime) { throw 'Owned staging process identity changed; preserve it' }
$children = @(Get-CimInstance Win32_Process -Filter 'ParentProcessId = 3764')
if ($children.Count -ne 0) { throw 'Staging still has child processes; no handoff' }
$stageFile = Join-Path $outputDirectory 'stage-dependencies.cjs'
if ((Get-FileHash -LiteralPath $stageFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne '510d6bb67276c28ce0bde94488077d22aa6c5986452257e41046992ac3b4b11c') { throw 'Frozen stage recipe changed' }
$storageDirectory = 'D:\p04-r06-fullapp-20261109-r1'
$copyLog = Join-Path $outputDirectory 'dependency-copy.log'
$copyText = [IO.File]::ReadAllText($copyLog)
if ($copyText -notmatch 'Files\s*:\s+152806\s+152806\s+0\s+0\s+0\s+0' -or $copyText -notmatch 'Dirs\s*:\s+18978\s+18977\s+1\s+0\s+0\s+0' -or $copyText -notmatch 'Ended\s*:') { throw 'Completed clean copy summary is missing' }
foreach ($name in @('source','postgres','artifact','runtime-repaired','runtime-legacy')) { if (Test-Path -LiteralPath (Join-Path $storageDirectory $name)) { throw 'Later work has started; preserve active workflow' } }
foreach ($name in @('dependency-staging.json','candidate-context.json','build-result.json','dependency-staging-interrupted.json')) { if (Test-Path -LiteralPath (Join-Path $outputDirectory $name)) { throw 'Existing outcome requires reconciliation instead of interruption' } }
$manifestPath = Join-Path $storageDirectory 'dependency-input-manifest.json.gz'
$proof = [ordered]@{ at=[DateTimeOffset]::UtcNow.ToString('o'); classification='intentional_handoff_after_copy_during_serial_read_verification'; serialIntegrityVerified=$false; finalSchemaAssertionReached=$false; process=@{pid=3764;parentPid=$ownedProcess.ParentProcessId;createdAt=$ownedProcess.CreationDate;executable=$ownedProcess.ExecutablePath;commandLine=$ownedProcess.CommandLine;children=0;readOperations=$ownedProcess.ReadOperationCount;readBytes=$ownedProcess.ReadTransferCount;writeBytes=$ownedProcess.WriteTransferCount}; stageScriptSha256=(Get-FileHash -LiteralPath $stageFile -Algorithm SHA256).Hash.ToLowerInvariant(); copy=@{files=152806;copied=152806;failed=0;mismatch=0;extra=0;logSha256=(Get-FileHash -LiteralPath $copyLog -Algorithm SHA256).Hash.ToLowerInvariant()}; inputManifest=@{path=$manifestPath;compressedSha256=(Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()}; source='D:\p04-v02-fullapp-20261109-r1\source\node_modules';destination=(Join-Path $storageDirectory 'dependencies') }
$preflightPath = Join-Path $outputDirectory 'dependency-handoff-preflight.json'
$stream = [IO.File]::Open($preflightPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
try { $bytes=[Text.Encoding]::UTF8.GetBytes(($proof | ConvertTo-Json -Depth 8));$stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
$handle = Get-Process -Id 3764
if ($handle.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffff') -cne $expectedCreated.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.ffffff')) { throw 'Process handle creation time changed' }
if (Test-Path -LiteralPath (Join-Path $outputDirectory 'dependency-staging.json')) { throw 'Serial receipt completed before interruption; preserve it' }
Stop-Process -InputObject $handle -Force
if (-not $handle.WaitForExit(10000)) { throw 'Owned stage exit not confirmed' }
$proof.stoppedAt=[DateTimeOffset]::UtcNow.ToString('o')
$proof.exactOwnedProcessStopped=$true
$proof.passed=$false
$proof.status='interrupted_incomplete_integrity_verification'
$receiptPath=Join-Path $outputDirectory 'dependency-staging-interrupted.json'
$stream=[IO.File]::Open($receiptPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
try { $bytes=[Text.Encoding]::UTF8.GetBytes(($proof | ConvertTo-Json -Depth 8));$stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
[ordered]@{status=$proof.status;ownedProcessStopped=$proof.exactOwnedProcessStopped;copyFiles=$proof.copy.files;serialIntegrityVerified=$false} | ConvertTo-Json -Compress
