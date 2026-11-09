# Only supplies the existing Management API credential via stdin, never argv/env/file.
$ErrorActionPreference='Stop'
$source=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'read-goabase-runtime-logs.ps1') -Raw
& ([scriptblock]::Create($source.Substring(0,$source.IndexOf('function Safe-Text'))))
try {
 $token=[SpotsCliCredential]::Token()
 $info=New-Object System.Diagnostics.ProcessStartInfo
 $info.FileName='node.exe'
 $info.Arguments='scripts/test-goabase-frozen-release.cjs --deploy-eszip'
 $info.WorkingDirectory=Split-Path $PSScriptRoot -Parent
 $info.UseShellExecute=$false
 $info.CreateNoWindow=$true
 $info.RedirectStandardInput=$true
 $process=[System.Diagnostics.Process]::Start($info)
 $process.StandardInput.Write($token)
 $process.StandardInput.Close()
 $token=$null
 $process.WaitForExit()
 exit $process.ExitCode
}finally{$token=$null}
