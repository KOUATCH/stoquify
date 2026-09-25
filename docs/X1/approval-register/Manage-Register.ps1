param([ValidateSet('Menu','Render')][string]$Action = 'Menu')
$ErrorActionPreference = 'Stop'
$registerRoot = $PSScriptRoot
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $registerRoot '..\..\..'))
$runtime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodePath = Join-Path $runtime 'node\bin\node.exe'
$pythonPath = Join-Path $runtime 'python\python.exe'
$registerCli = Join-Path $repositoryRoot 'scripts\x1-local-approval-register.js'
$documentsCli = Join-Path $repositoryRoot 'scripts\x1-approval-register-documents.py'
function Invoke-Register([string[]]$Arguments) {
    $output = & $nodePath $registerCli @Arguments
    if ($LASTEXITCODE -ne 0) { throw ($output -join "`n") }
    return ($output -join "`n" | ConvertFrom-Json)
}
function Invoke-Forms([string]$Mode) {
    & $pythonPath $documentsCli $Mode
    if ($LASTEXITCODE -ne 0) { throw 'Form processing stopped. Review the reported field or file.' }
}
function Select-Record {
    $kind = Read-Host 'Record: adoption, product, evidence, or independent'
    if ($kind -notin @('adoption','product','evidence','independent')) { throw 'Choose an existing record type.' }
    return $kind
}
function Enroll-Controller {
    if (Test-Path -LiteralPath (Join-Path $registerRoot 'controllers\controller-public.json')) { throw 'Controller already enrolled. Do not replace this key.' }
    $name = Read-Host 'Actual full name of the document controller'
    if ([string]::IsNullOrWhiteSpace($name)) { throw 'Controller name is required.' }
    $controllerIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $cert = New-SelfSignedCertificate -Subject 'CN=Stoquify X1 Local Document Controller' -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 -KeyUsage DigitalSignature -KeyExportPolicy NonExportable -NotAfter (Get-Date).AddYears(3)
    $pem = "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($cert.RawData, [Base64FormattingOptions]::InsertLineBreaks) + "`n-----END CERTIFICATE-----`n"
    $enrollment = @{name=$name; windowsSid=$controllerIdentity.User.Value; thumbprint=$cert.Thumbprint; certificatePem=$pem}
    [IO.File]::WriteAllText((Join-Path $registerRoot 'controllers\enrollment-request.json'), ($enrollment | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    Invoke-Register -Arguments @('enroll') | Format-List
    Invoke-Forms 'prefill-controller'
    Write-Host 'Enrollment created a local verification key. It did not approve or sign a business decision.'
}
function Sign-Prepared([string]$kind, [bool]$revocation) {
    $enrolled = Get-Content -LiteralPath (Join-Path $registerRoot 'controllers\controller-public.json') -Raw | ConvertFrom-Json
    if ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value -ne $enrolled.windowsSid) { throw 'Use the Windows account of the enrolled document controller.' }
    if ($revocation) {
        $reason = Read-Host 'Reason for revocation'
        $prepared = Invoke-Register -Arguments @('prepare-revocation', $kind, $reason)
    } else {
        Invoke-Forms 'extract'
        $prepared = Invoke-Register -Arguments @('prepare', $kind)
    }
    $prepared | Format-List
    $verb = if ($revocation) { 'REVOKE' } else { 'VERIFY' }
    Write-Host 'Review the signed PDF, the original signature, signer identity, authority, exact scope and actual signing time yourself.'
    $confirmation = Read-Host "To personally attest, enter $verb $($prepared.recordId)"
    if ($confirmation -cne "$verb $($prepared.recordId)") { throw 'No attestation was made.' }
    $certificatePath = 'Cert:\CurrentUser\My\' + $enrolled.thumbprint
    $certificate = Get-Item -LiteralPath $certificatePath
    $rsa = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($certificate)
    if ($null -eq $rsa) { throw 'The enrolled private key is unavailable.' }
    try {
        $bytes = [IO.File]::ReadAllBytes($prepared.payloadPath)
        $signature = $rsa.SignData($bytes, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)
    } finally { $rsa.Dispose() }
    $signaturePath = Join-Path (Split-Path -Parent $prepared.payloadPath) 'pending-signature.txt'
    [IO.File]::WriteAllText($signaturePath, [Convert]::ToBase64String($signature), [Text.UTF8Encoding]::new($false))
    $command = if ($revocation) { 'revoke' } else { 'seal' }
    Invoke-Register -Arguments @($command, $kind) | Format-List
}
function Render-Forms {
    $settings = Get-Content -LiteralPath (Join-Path $registerRoot 'register.json') -Raw | ConvertFrom-Json
    $word = $null
    $anchor = $null
    try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false; $word.DisplayAlerts = 0; $word.AutomationSecurity = 3
        # Keep Word alive while the last source document closes between exports.
        $anchor = $word.Documents.Add()
        foreach ($property in $settings.records.PSObject.Properties) {
            $folder = Join-Path $registerRoot ('records\' + $property.Value)
            $verified = Get-Content -LiteralPath (Join-Path $folder 'signature-verification.json') -Raw | ConvertFrom-Json
            if ($verified.signature) { continue }
            foreach ($stem in @('approval-form','controller-review')) {
                $document = $null
                try {
                    $document = $word.Documents.Open((Join-Path $folder ($stem + '.docx')), $false, $true, $false)
                    $document.Repaginate()
                    $pdf = Join-Path $folder ($stem + '-unsigned.pdf')
                    $document.ExportAsFixedFormat($pdf, 17)
                    [pscustomobject]@{Record=$property.Name; Pages=$document.ComputeStatistics(2); PDF=$pdf} | ConvertTo-Json -Compress
                } finally { if ($null -ne $document) { $document.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) } }
            }
        }
    } finally {
        if ($null -ne $anchor) { try { $anchor.Close(0) } catch [Runtime.InteropServices.COMException] {} ; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($anchor) }
        if ($null -ne $word) { try { if ($word.Documents.Count -eq 0) { $word.Quit() } } catch [Runtime.InteropServices.COMException] {} ; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    }
}
if ($Action -eq 'Render') { Render-Forms; exit }
while ($true) {
    Write-Host "`nSTOQUIFY LOCAL APPROVAL REGISTER"
    Write-Host '1 Enroll document controller (once)'
    Write-Host '2 Import filled Word forms'
    Write-Host '3 Produce unsigned PDFs for printing'
    Write-Host '4 Verify and seal a signed record'
    Write-Host '5 Show missing information'
    Write-Host '6 Synchronize completed approvals'
    Write-Host '7 Revoke an approval'
    Write-Host '8 Exit'
    try {
        switch (Read-Host 'Choose a number') {
            '1' { Enroll-Controller }
            '2' { Invoke-Forms 'extract' }
            '3' { Render-Forms }
            '4' { Sign-Prepared (Select-Record) $false }
            '5' { Invoke-Forms 'extract'; & $nodePath $registerCli report }
            '6' { Invoke-Register -Arguments @('sync') | Format-List }
            '7' { Sign-Prepared (Select-Record) $true }
            '8' { return }
            default { Write-Host 'Choose 1 through 8.' }
        }
    } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
}
