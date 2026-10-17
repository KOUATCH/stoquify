$ErrorActionPreference = 'Stop'
$outRoot = 'E:\ohada saas\Focused projects\stoquify\what-next\bakery-booklet-2026-10-03'
$wordApp = $null
$bookDoc = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $bookDoc = $wordApp.Documents.Open((Join-Path $outRoot 'Nkambe_Bakery_Handbook.docx'), $false, $false)
    $bookDoc.Repaginate()
    $bookDoc.Fields.Update() | Out-Null
    foreach ($bookToc in $bookDoc.TablesOfContents) { $bookToc.Update() }
    $bookDoc.Repaginate()
    foreach ($bookToc in $bookDoc.TablesOfContents) { $bookToc.UpdatePageNumbers() }
    $bookDoc.Save()
    $bookDoc.ExportAsFixedFormat((Join-Path $outRoot 'Nkambe_Bakery_Handbook.pdf'),17,$false,0,0,1,1,0,$true,$true,1,$true,$true,$false)
    Write-Output ('Pages: '+$bookDoc.ComputeStatistics(2))
} finally {
    if ($null -ne $bookDoc) { $bookDoc.Close(0) }
    if ($null -ne $wordApp) { try { $wordApp.Quit() } catch { Write-Output 'Word had already closed after document export.' } }
}
