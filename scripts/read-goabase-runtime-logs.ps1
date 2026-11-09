# Read-only Management API logs. Existing CLI credential stays in this process only.
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SpotsCliCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct CREDENTIAL {
  public uint Flags; public uint Type; public string TargetName; public string Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
  public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
 }
 [DllImport("advapi32", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern bool Read(string target, uint type, uint reserved, out IntPtr credential);
 [DllImport("advapi32", SetLastError=true)] public static extern void CredFree(IntPtr credential);
 public static string Token() {
  IntPtr ptr;
  if(!Read("Supabase CLI:supabase",1,0,out ptr)) throw new Exception("CLI credential unavailable");
  try {
   var c=(CREDENTIAL)Marshal.PtrToStructure(ptr,typeof(CREDENTIAL));
   var bytes=new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob,bytes,0,bytes.Length);
   var value=System.Text.Encoding.UTF8.GetString(bytes).TrimEnd('\0');
   Array.Clear(bytes,0,bytes.Length); return value;
  } finally { CredFree(ptr); }
 }
}
'@
function Safe-Text($value, $pattern) {
 if ($null -ne $value -and [string]$value -match $pattern) { return [string]$value }
 return $null
}
try {
 $accessToken = [SpotsCliCredential]::Token()
 if ($accessToken -notmatch '^sbp_[A-Za-z0-9_-]+$') { throw 'Unexpected credential encoding' }
 $headers = @{ Authorization = "Bearer $accessToken" }
 $windows = @(
  @{ Name='production-failure'; Ref='yhnxdeypkbzyjappuzmv'; Start='2026-11-08T16:39:00Z'; End='2026-11-08T16:42:00Z' },
  @{ Name='test-success'; Ref='nfomkdvotqtlyymomksb'; Start='2026-11-05T22:58:00Z'; End='2026-11-05T23:01:00Z' }
 )
 $reports = @()
 foreach ($window in $windows) {
  $sql = "select timestamp,id,source,event_message,log_attributes['function_id'] as function_id,log_attributes['execution_id'] as execution_id,log_attributes['response.status_code'] as status_code,log_attributes['request.method'] as method,log_attributes['execution_time_ms'] as execution_time_ms,log_attributes['region'] as region,log_attributes['version'] as version,log_attributes['sb_region'] as sb_region,log_attributes['served_by'] as served_by from logs where source in ('function_logs','function_edge_logs') order by timestamp asc limit 100"
  $uri = "https://api.supabase.com/v1/projects/$($window.Ref)/analytics/endpoints/logs?iso_timestamp_start=$($window.Start)&iso_timestamp_end=$($window.End)&sql=$([uri]::EscapeDataString($sql))"
  try {
   $response = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers -TimeoutSec 30
   $entries = @()
   foreach ($row in $response.result) {
    $parsed = $null
    try { $parsed = $row.event_message | ConvertFrom-Json -ErrorAction Stop } catch {}
    $entry = [ordered]@{
     timestamp=$row.timestamp; source=$row.source;
     function_id=(Safe-Text $row.function_id '^[a-f0-9-]{36}$');
     execution_id=(Safe-Text $row.execution_id '^[a-f0-9-]{36}$');
     status_code=(Safe-Text $row.status_code '^\d{3}$');
     method=(Safe-Text $row.method '^(GET|POST|OPTIONS)$');
     execution_time_ms=(Safe-Text $row.execution_time_ms '^\d+(\.\d+)?$');
     region=(Safe-Text $row.region '^[a-z0-9-]{1,50}$');
     sb_region=(Safe-Text $row.sb_region '^[a-z0-9-]{1,50}$');
     version=(Safe-Text $row.version '^\d{1,8}$');
     served_by=(Safe-Text $row.served_by '^[A-Za-z0-9 .()+_-]{1,160}$')
    }
    if ($parsed.sync -eq 'goabase') {
     $entry.error = Safe-Text $parsed.error '^[a-z0-9_]{1,100}$'
     $entry.run = Safe-Text $parsed.run '^[a-f0-9-]{36}$'
     $entry.duration_ms = Safe-Text $parsed.duration_ms '^\d+$'
     foreach ($name in @('inserted','updated','unchanged','checked','discovered')) {
      if ($null -ne $parsed.$name) { $entry[$name] = Safe-Text $parsed.$name '^\d+$' }
     }
    }
    $entry.message_kind = if ($parsed.sync -eq 'goabase') { 'goabase_structured' } elseif ($row.event_message -match '^booted') { 'runtime_boot' } elseif ($row.event_message -match '^shutdown') { 'runtime_shutdown' } else { 'other_message_withheld' }
    $entries += $entry
   }
   $reports += @{ name=$window.Name; project_ref=$window.Ref; start=$window.Start; end=$window.End; status=200; rows=$entries }
  } catch {
   $status = $null
   if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
   $reports += @{ name=$window.Name; project_ref=$window.Ref; status=$status; error='Log retrieval failed; raw response withheld' }
  }
 }
 $result = @{ captured_at=[DateTime]::UtcNow.ToString('o'); requests='Management API GET only'; windows=$reports }
 $file = Join-Path $PSScriptRoot '../supabase/.temp/production-runtime-log-investigation.json'
 $result | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath $file
 $result | ConvertTo-Json -Depth 12 -Compress
} catch {
 Write-Output 'Protected read-only log lookup failed; credential/error details withheld.'
 exit 1
} finally {
 $headers = $null; $accessToken = $null; $response = $null
}
