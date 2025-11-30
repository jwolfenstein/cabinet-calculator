Param(
  [string]$ProjectRoot = "$PSScriptRoot\..",
  [string]$OutDir = "$PSScriptRoot\..\backups"
)

# Resolve full paths
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$resolvedOut = $null
try {
  $resolvedOut = (Resolve-Path $OutDir -ErrorAction Stop).Path
} catch {
  if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
  $resolvedOut = (Resolve-Path $OutDir).Path
}
$OutDir = $resolvedOut

# Timestamped filename
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zip = Join-Path $OutDir "cabinet-calculator-$stamp.zip"

# Stage: copy project to a temp folder excluding heavy/derived folders
$stage = Join-Path $env:TEMP "cabcalc-backup-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# Mirror with exclusions (node_modules, dist, .git, backups)
$robolog = Join-Path $env:TEMP "cabcalc-robocopy-$stamp.log"
robocopy $ProjectRoot $stage /MIR /NFL /NDL /NP /R:1 /W:1 /XD node_modules dist .git backups .turbo .next coverage  | Out-File $robolog

# Zip it
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

# Clean staging
Remove-Item $stage -Recurse -Force

Write-Host "Backup created:" $zip

