$ErrorActionPreference = "Stop"
$taskName = "AIONEX Daily Narrated Video"
$projectDirectory = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node.exe).Source
$runner = Join-Path $PSScriptRoot "run-daily-video-automation.mjs"
$action = New-ScheduledTaskAction -Execute $node -Argument "--env-file-if-exists=.env.local `"$runner`"" -WorkingDirectory $projectDirectory
$triggers = @(
  (New-ScheduledTaskTrigger -Daily -At "10:00"),
  (New-ScheduledTaskTrigger -Daily -At "15:00"),
  (New-ScheduledTaskTrigger -Daily -At "20:00")
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Description "Generate narrated 1080x1920 AIONEX videos at 10:00, 15:00, and 20:00 and publish to official Telegram and YouTube." -Force | Out-Null
Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo | Select-Object TaskName,NextRunTime,LastRunTime,LastTaskResult
