$ErrorActionPreference = "Stop"
$taskName = "AIONEX Daily Narrated Video"
$projectDirectory = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "--env-file-if-exists=.env.local scripts/run-daily-video-automation.mjs" -WorkingDirectory $projectDirectory
$trigger = New-ScheduledTaskTrigger -Daily -At "10:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Generate one narrated 1080x1920 AIONEX video and publish it only to official Telegram." -Force | Out-Null
Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo | Select-Object TaskName,NextRunTime,LastRunTime,LastTaskResult
