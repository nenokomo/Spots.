param([ValidateSet('setup','resume','job','probe','activate','scheduled','diagnose','platform-review','vault-check')][string]$Stage)
$ErrorActionPreference='Stop'
$source=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'read-goabase-runtime-logs.ps1') -Raw
& ([scriptblock]::Create($source.Substring(0,$source.IndexOf('function Safe-Text'))))
try {
 $token=[SpotsCliCredential]::Token()
 $info=New-Object System.Diagnostics.ProcessStartInfo
 $info.FileName='node.exe'
 $info.Arguments="scripts/finish-goabase-automation.cjs $Stage"
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
} finally {$token=$null}
