# Read-only source comparison. Prints JSON; never imports Prisma or reads env files.
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../../../'))
$current = Join-Path $repo 'prisma/schema.prisma'
$frozen = Join-Path $repo '.codex-tmp/af16-release-20261026/prisma/schema.prisma'
$private = Join-Path $repo '.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/schema.prisma'
$pattern = '(?ms)^(model|enum|generator|datasource)\s+(\w+)\s*\{(.*?)^\}'
function Read-SchemaBlocks([string]$file) {
    $blocks = @{}
    foreach ($match in [regex]::Matches((Get-Content -LiteralPath $file -Raw), $pattern)) {
        $key = $match.Groups[1].Value + ' ' + $match.Groups[2].Value
        if ($blocks.ContainsKey($key)) { throw "Duplicate schema block: $key" }
        $declarations = @($match.Groups[3].Value -split '\r?\n' | ForEach-Object { $_ -replace '\s+', '' } | Where-Object { $_ } | Sort-Object)
        $blocks[$key] = $declarations -join "`n"
    }
    return $blocks
}
$left = Read-SchemaBlocks $current
$right = Read-SchemaBlocks $private
$different = @($left.Keys | Where-Object { !$right.ContainsKey($_) -or $left[$_] -cne $right[$_] })
$extra = @($right.Keys | Where-Object { !$left.ContainsKey($_) })
$currentHash = (Get-FileHash -LiteralPath $current -Algorithm SHA256).Hash.ToLowerInvariant()
$frozenHash = (Get-FileHash -LiteralPath $frozen -Algorithm SHA256).Hash.ToLowerInvariant()
[ordered]@{
    checkedAt = [DateTime]::UtcNow.ToString('o')
    method = 'Exact current/frozen hashes; per-named-block whitespace-normalized declaration multisets for generated schema. No Prisma parser/runtime execution.'
    currentSha256 = $currentHash
    frozenSha256 = $frozenHash
    privateGeneratedSha256 = (Get-FileHash -LiteralPath $private -Algorithm SHA256).Hash.ToLowerInvariant()
    currentBlocks = $left.Count
    privateBlocks = $right.Count
    differingBlocks = $different
    extraPrivateBlocks = $extra
    passed = ($currentHash -ceq $frozenHash -and $left.Count -eq 452 -and $right.Count -eq $left.Count -and !$different.Count -and !$extra.Count)
    limitation = 'Source compatibility check only; runner must independently verify migration catalogue and fresh target history.'
} | ConvertTo-Json -Depth 4
