# Phase 2 memory monitor: read-only browser process private bytes/working set.
# Selects the one visible bridge-owned Chrome profile, ignoring other user browsers.
param([ValidateRange(15,30)][int]$Minutes=15,
      [ValidateRange(10,60)][int]$IntervalSeconds=20)
$ErrorActionPreference="Stop"
$reportRoot=Join-Path $PSScriptRoot '..\teavm-poc\target\engine\phase2-reports'
New-Item -ItemType Directory -Path $reportRoot -Force | Out-Null
$root=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" |
    Where-Object {$_.CommandLine -like '*soloscape-stage1-mcp-*' -and
                  $_.CommandLine -notlike '*--type=*' -and
                  $_.CommandLine -notlike '*--headless*' -and
                  $_.CommandLine -like '*127.0.0.1:3097*'} |
    Sort-Object CreationDate -Descending | Select-Object -First 1
if(-not $root){throw "No visible bridge-owned original-engine Chrome process found"}
if($root.CommandLine -notmatch 'soloscape-stage1-mcp-[A-Za-z0-9_-]+'){throw "Invalid browser profile"}
$profile=$Matches[0]
Write-Output "[READY] Monitoring visible original-engine Chrome only, for $Minutes minutes."
$rows=[System.Collections.Generic.List[object]]::new()
$started=Get-Date
$max=$Minutes*60
while(((Get-Date)-$started).TotalSeconds -lt $max){
    $chrome=Get-CimInstance Win32_Process -Filter "name='chrome.exe'" |
        Where-Object {$_.CommandLine -like "*$profile*"}
    $private=0.0;$working=0.0;$count=0
    foreach($process in $chrome){
        try {
            $p=Get-Process -Id $process.ProcessId -ErrorAction Stop
            $private+=$p.PrivateMemorySize64/1MB
            $working+=$p.WorkingSet64/1MB
            $count++
        }catch{}
    }
    $elapsed=[math]::Round(((Get-Date)-$started).TotalSeconds,1)
    $rows.Add([pscustomobject]@{ElapsedSeconds=$elapsed;ProcessCount=$count;
        PrivateMB=[math]::Round($private,1);WorkingSetMB=[math]::Round($working,1)})
    if($rows.Count -eq 1 -or $rows.Count%3 -eq 0){
        Write-Output ("[MEMORY] elapsed={0}s process_count={1} private={2}MB rss={3}MB" -f
            $elapsed,$count,[math]::Round($private,1),[math]::Round($working,1))
    }
    if($count -eq 0){Write-Output "[WARN] Bridge-owned Chrome exited";break}
    Start-Sleep -Seconds ([Math]::Min($IntervalSeconds,[Math]::Max(0,$max-$elapsed)))
}
$report=Join-Path $reportRoot ("chrome-memory-"+(Get-Date -Format 'yyyyMMdd-HHmmss')+".csv")
$rows|Export-Csv -Path $report -NoTypeInformation
Write-Output "[COMPLETE] $report"
if($rows.Count -ge 2){
    $initial=$rows[0];$last=$rows[$rows.Count-1]
    Write-Output ("[SUMMARY] samples={0} private_start={1}MB private_end={2}MB private_delta={3}MB private_peak={4}MB" -f
        $rows.Count,$initial.PrivateMB,$last.PrivateMB,
        [math]::Round($last.PrivateMB-$initial.PrivateMB,1),
        [math]::Round(($rows|Measure-Object PrivateMB -Maximum).Maximum,1))
}
