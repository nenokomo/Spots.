# Management API GET only; no function invocation, database access or deployment.
$ErrorActionPreference = 'Stop'
$credentialSource = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'read-goabase-runtime-logs.ps1') -Raw
$credentialEnd = $credentialSource.IndexOf('function Safe-Text')
if ($credentialEnd -lt 0) { throw 'Credential helper missing' }
& ([scriptblock]::Create($credentialSource.Substring(0, $credentialEnd)))
$root = Split-Path $PSScriptRoot -Parent
$directory = Join-Path $root ('supabase/backups/bundle-inspection-' + [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH-mm-ss-fffZ'))
New-Item -ItemType Directory -Path $directory | Out-Null
$owner = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls $directory /inheritance:r /grant:r "${owner}:(OI)(CI)F" | Out-Null
try {
 $token = [SpotsCliCredential]::Token()
 if ($token -notmatch '^sbp_[A-Za-z0-9_-]+$') { throw 'Credential encoding invalid' }
 $headers = @{ Authorization = "Bearer $token" }
 $projects = Invoke-RestMethod -Method Get -Uri 'https://api.supabase.com/v1/projects' -Headers $headers -TimeoutSec 30
 $rows = @()
 foreach ($target in @(@{Name='test';Ref='nfomkdvotqtlyymomksb';ProjectName='spots. testproject'},@{Name='production';Ref='yhnxdeypkbzyjappuzmv';ProjectName='Spots.'})) {
  if (@($projects | Where-Object { $_.id -eq $target.Ref -and $_.name -eq $target.ProjectName }).Count -ne 1) { throw 'Project identity mismatch' }
  $base = "https://api.supabase.com/v1/projects/$($target.Ref)/functions/import-goabase"
  $meta = Invoke-RestMethod -Method Get -Uri $base -Headers $headers -TimeoutSec 30
  if ($meta.version -ne 3 -or $meta.status -ne 'ACTIVE' -or $meta.verify_jwt -ne $false) { throw 'Unexpected function state' }
  $file = Join-Path $directory ($target.Name + '.body')
  $response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri ($base + '/body') -Headers $headers -MaximumRedirection 0 -OutFile $file -PassThru -TimeoutSec 60
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $row = [ordered]@{ name=$target.Name; project_ref=$target.Ref; version=$meta.version; status=$meta.status; verify_jwt=$meta.verify_jwt; import_map=$meta.import_map; entrypoint_path=$meta.entrypoint_path; import_map_path=$meta.import_map_path; ezbr_sha256=$meta.ezbr_sha256; body_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLower(); bytes=$bytes.Length; magic=[BitConverter]::ToString($bytes,0,[Math]::Min(12,$bytes.Length)); content_type=[string]$response.Headers['Content-Type'] }
  $row | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directory ($target.Name + '.json')) -Encoding UTF8
  $rows += $row
 }
 $pointer = @{directory=$directory;requests='Management API GET only';functions=$rows;captured_at=[DateTime]::UtcNow.ToString('o')}
 $pointer | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'supabase/.temp/goabase-bundle-inspection.json') -Encoding UTF8
 $pointer | ConvertTo-Json -Depth 8 -Compress
} catch {
 Write-Output 'Read-only bundle download failed; raw diagnostics and credentials withheld.'
 exit 1
} finally { $headers=$null; $token=$null; $projects=$null }
