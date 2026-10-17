$ErrorActionPreference = 'Stop'
$packRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$documents = Get-ChildItem -LiteralPath $packRoot -Filter '*.docx' | Sort-Object Name
$wordApp = $null
$results = @()
foreach ($source in $documents) {
  try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordApp.AutomationSecurity = 3
    $openedDoc = $null
    try {
      $openedDoc = $wordApp.Documents.Open($source.FullName, $false, $true, $false)
      $openedDoc.Repaginate()
      $pageCount = $openedDoc.ComputeStatistics(2)
      $pdfPath = [System.IO.Path]::ChangeExtension($source.FullName, '.pdf')
      $openedDoc.ExportAsFixedFormat($pdfPath, 17)
      $results += [PSCustomObject]@{file=$source.Name; pages=$pageCount; pdf=[System.IO.Path]::GetFileName($pdfPath)}
    } finally {
      if ($null -ne $openedDoc) { try { $openedDoc.Close(0) } catch { Write-Warning $_.Exception.Message }; [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($openedDoc) }
    }
  } finally {
    if ($null -ne $wordApp) { try { $wordApp.Quit(0) } catch { Write-Warning $_.Exception.Message }; [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp); $wordApp = $null }
  }
}
$results | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $packRoot 'word-render-results.json') -Encoding utf8
$results | Format-Table
