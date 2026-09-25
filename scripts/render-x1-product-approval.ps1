$ErrorActionPreference = 'Stop'
$x1Root = Split-Path -Parent $PSScriptRoot
$x1DocPath = Join-Path $x1Root 'docs\X1\X1_PRODUCT_PERFORMANCE_APPROVAL_FOR_SIGNATURE_2026-09-05.docx'
$x1PdfPath = Join-Path $x1Root 'docs\X1\X1_PRODUCT_PERFORMANCE_APPROVAL_FOR_SIGNATURE_2026-09-05.pdf'
if (Test-Path -LiteralPath $x1PdfPath) { throw 'Preserve the existing approval PDF; choose a new output version.' }
$x1Word = $null
$x1Document = $null
try {
    $x1Word = New-Object -ComObject Word.Application
    $x1Word.Visible = $false
    $x1Word.DisplayAlerts = 0
    $x1Word.AutomationSecurity = 3
    $x1Document = $x1Word.Documents.Open($x1DocPath, $false, $true, $false)
    $x1Document.Repaginate()
    $x1Document.ExportAsFixedFormat($x1PdfPath, 17)
    [pscustomobject]@{ Renderer = 'Microsoft Word'; Pages = $x1Document.ComputeStatistics(2); PDF = $x1PdfPath } | ConvertTo-Json
}
finally {
    if ($null -ne $x1Document) { $x1Document.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($x1Document) }
    if ($null -ne $x1Word) {
        try { if ($x1Word.Documents.Count -eq 0) { $x1Word.Quit() } }
        catch [System.Runtime.InteropServices.COMException] {
            # Word may exit automatically after the last read-only document closes.
            if ($_.Exception.HResult -ne -2147023174) { throw }
        }
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($x1Word)
    }
}
