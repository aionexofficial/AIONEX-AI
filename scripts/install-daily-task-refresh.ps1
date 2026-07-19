param([string]$TaskName="AIONEX Daily Task Recovery")
$ErrorActionPreference="Stop"
$project=(Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$node=(Get-Command node).Source
$action=New-ScheduledTaskAction -Execute $node -Argument "--env-file-if-exists=.env.local scripts/run-daily-task-refresh.mjs" -WorkingDirectory $project
$start=(Get-Date).AddMinutes(5)
$trigger=New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Hours 1)
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Idempotent hourly recovery for the AIONEX 00:00 UTC daily task refresh." -Force | Out-Null
Write-Output "Installed $TaskName. Vercel remains the 00:00 UTC primary; this task is hourly recovery."
