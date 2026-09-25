$ErrorActionPreference = 'Stop'
$registerRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$registerDocPath = Join-Path $registerRoot 'docs\approval-register\STOQUIFY_APPROVAL_REGISTER_OPERATING_GUIDE_2026-09-03.docx'
$registerPdfPath = Join-Path $PSScriptRoot 'STOQUIFY_APPROVAL_REGISTER_OPERATING_GUIDE_2026-09-03.pdf'
$registerWord = $null
$registerDocument = $null
try {
    $registerWord = New-Object -ComObject Word.Application
    $registerWord.Visible = $false
    $registerWord.DisplayAlerts = 0
    $registerWord.AutomationSecurity = 3
    $registerDocument = $registerWord.Documents.Open($registerDocPath, $false, $true, $false)
    $registerDocument.Repaginate()
    $registerDocument.ExportAsFixedFormat($registerPdfPath, 17)
    [pscustomobject]@{ Renderer = 'Microsoft Word'; Pages = $registerDocument.ComputeStatistics(2); PDF = $registerPdfPath } | ConvertTo-Json
}
finally {
    if ($null -ne $registerDocument) { $registerDocument.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($registerDocument) }
    if ($null -ne $registerWord) {
        try { if ($registerWord.Documents.Count -eq 0) { $registerWord.Quit() } }
        catch [System.Runtime.InteropServices.COMException] { if ($_.Exception.HResult -ne -2147023174) { throw } }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($registerWord)
    }
}
