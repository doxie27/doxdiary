<#
  Doxie Diary – Backup automatisch herunterladen (für die Windows-Aufgabenplanung)

  Einrichtung (einmalig):
    1. Token erzeugen (PowerShell):
         $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
         ($b | ForEach-Object { $_.ToString('x2') }) -join '' | Set-Content "$env:USERPROFILE\.doxie-backup-token" -NoNewline
    2. Denselben Wert auf dem Server in doxie-private/config.php unter backup.token eintragen.
    3. Aufgabenplanung → Einfache Aufgabe → täglich →
         Programm:   powershell.exe
         Argumente:  -NoProfile -ExecutionPolicy Bypass -File "C:\Pfad\zu\backup-download.ps1"

  Die ZIP-Dateien sind mit backup.password (AES-256) verschlüsselt. Öffnen z. B. mit 7-Zip
  (der Windows-Explorer kann AES-verschlüsselte ZIPs nicht entpacken).
#>
param(
  [string]$Url = 'https://www.doxiediary.de/doxiediary/api/v1/admin/backup',
  [string]$TokenFile = "$env:USERPROFILE\.doxie-backup-token",
  [string]$Target = "$env:USERPROFILE\Documents\Doxie-Backups",
  [int]$Keep = 30
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Target | Out-Null
$log = Join-Path $Target 'backup.log'

function Write-Log([string]$msg) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content -Path $log
}

try {
  if (-not (Test-Path $TokenFile)) { throw "Token-Datei fehlt: $TokenFile" }
  $token = (Get-Content $TokenFile -Raw).Trim()
  $file = Join-Path $Target ("doxie-diary-backup-{0}.zip" -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $Url -Headers @{ Authorization = "Bearer $token" } -OutFile $file -UseBasicParsing -TimeoutSec 600
  $size = (Get-Item $file).Length
  if ($size -lt 500) { Remove-Item $file; throw "Backup zu klein ($size Bytes) – Token oder Server prüfen" }
  Write-Log ("OK  {0}  {1:N0} KB" -f (Split-Path $file -Leaf), ($size / 1KB))

  # Alte Backups aufräumen
  Get-ChildItem $Target -Filter 'doxie-diary-backup-*.zip' | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item
}
catch {
  Write-Log "FEHLER  $($_.Exception.Message)"
  exit 1
}
