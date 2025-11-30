<#
.SYNOPSIS
  Restore the project from a ZIP in /backups.

.DESCRIPTION
  - Lists available backups and lets you pick one (or pass -BackupZip).
  - Creates a safety snapshot of the CURRENT project before restoring (unless -NoSafetyCopy).
  - Restores by mirroring the backup contents into the project root (with robocopy),
    excluding node_modules, dist, .git, and backups.

.PARAMETER BackupZip
  Optional path to a specific backup zip (relative or absolute). If omitted, you can select interactively.

.PARAMETER List
  Show available backups and exit.

.PARAMETER DryRun
  Show what would happen (no file changes).

.PARAMETER ProjectRoot
  Root of the project. Defaults to the folder above this scripts directory.

.PARAMETER NoSafetyCopy
  Skip making a safety snapshot of the current project before restoring.

.EXAMPLE
  # Interactively choose the latest backup
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore.ps1

.EXAMPLE
  # Restore a specific ZIP
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupZip .\backups\cabinet-calculator-20250101-093000.zip

.EXAMPLE
  # See available backups
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -List
#>

Param(
  [string]$BackupZip,
  [switch]$List,
  [switch]$DryRun,
  [string]$ProjectRoot = "$PSScriptRoot\..",
  [switch]$NoSafetyCopy
)

# --- Resolve key paths
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$BackupsDir  = Join-Path $ProjectRoot "backups"

if (-not (Test-Path $BackupsDir)) {
  Write-Error "Backups folder not found: $BackupsDir"
  exit 1
}

# --- Helper: list backups newest first
function Get-BackupFiles {
  Get-ChildItem -Path $BackupsDir -Filter "*.zip" -File |
    Sort-Object LastWriteTime -Descending
}

if ($List) {
  $files = Get-BackupFiles
  if (-not $files) { Write-Host "No backups found in $BackupsDir"; exit 0 }
  $i = 1
  foreach ($f in $files) {
    "{0}. {1}  ({2:yyyy-MM-dd HH:mm})" -f $i, $f.Name, $f.LastWriteTime
    $i++
  }
  exit 0
}

# --- Pick a backup zip (param or interactive)
$zipPath = $null
if ($BackupZip) {
  $zipPath = (Resolve-Path $BackupZip).Path 2>$null
  if (-not $zipPath) { Write-Error "BackupZip not found: $BackupZip"; exit 1 }
} else {
  $files = Get-BackupFiles
  if (-not $files) { Write-Error "No backups found in $BackupsDir"; exit 1 }

  Write-Host "Select a backup to restore:`n"
  $i = 1
  foreach ($f in $files) {
    "{0}. {1}  ({2:yyyy-MM-dd HH:mm})" -f $i, $f.Name, $f.LastWriteTime
    $i++
  }
  Write-Host ""
  do {
    $choice = Read-Host "Enter number (1-$($files.Count))"
    $ok = [int]::TryParse($choice, [ref]0) -and ($choice -as [int]) -ge 1 -and ($choice -as [int]) -le $files.Count
  } until ($ok)
  $zipPath = $files[([int]$choice - 1)].FullName
}

Write-Host ""
Write-Host "Project root :" $ProjectRoot
Write-Host "Backups dir  :" $BackupsDir
Write-Host "Restore from :" $zipPath
Write-Host ""

# --- Confirm restore behaviour
Write-Warning "This will mirror the backup into the project folder."
Write-Warning "Files present now but NOT in the backup will be deleted (except exclusions)."
$confirm = Read-Host "Proceed? (y/N)"
if ($confirm.ToLower() -ne "y") { Write-Host "Aborted."; exit 0 }

# --- DRY RUN mode
if ($DryRun) {
  Write-Host "[DryRun] Would create safety snapshot (unless -NoSafetyCopy)."
  Write-Host "[DryRun] Would expand ZIP to a staging folder and mirror to project root via robocopy."
  Write-Host "[DryRun] Exclusions: node_modules, dist, .git, backups, .turbo, .next, coverage"
  exit 0
}

# --- Safety snapshot (current state)
if (-not $NoSafetyCopy) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safetyZip = Join-Path $BackupsDir "safety-before-restore-$stamp.zip"
  $stage = Join-Path $env:TEMP "cabcalc-safety-$stamp"
  if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
  New-Item -ItemType Directory -Path $stage | Out-Null

  Write-Host "Creating safety snapshot of current project..."
  robocopy $ProjectRoot $stage /MIR /NFL /NDL /NP /R:1 /W:1 /XD node_modules dist .git backups .turbo .next coverage >$null
  if (Test-Path $safetyZip) { Remove-Item $safetyZip -Force }
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $safetyZip -CompressionLevel Optimal
  Remove-Item $stage -Recurse -Force
  Write-Host "Safety snapshot -> $safetyZip"
}

# --- Expand backup to staging
$restamp = Get-Date -Format "yyyyMMdd-HHmmss"
$restoreStage = Join-Path $env:TEMP "cabcalc-restore-$restamp"
if (Test-Path $restoreStage) { Remove-Item $restoreStage -Recurse -Force }
New-Item -ItemType Directory -Path $restoreStage | Out-Null

Write-Host "Extracting backup to staging..."
Expand-Archive -Path $zipPath -DestinationPath $restoreStage -Force

# --- Mirror staging -> project
Write-Host "Restoring into project (mirroring)..."
robocopy $restoreStage $ProjectRoot /MIR /NFL /NDL /NP /R:1 /W:1 `
  /XD node_modules dist .git backups .turbo .next coverage >$null

# --- Cleanup
Remove-Item $restoreStage -Recurse -Force

Write-Host ""
Write-Host "Restore complete ✔"
Write-Host "If dependencies changed, run:  npm install"
