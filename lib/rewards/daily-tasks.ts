import "server-only";

import { neon } from "@neondatabase/serverless";
import { dailyTaskExternalKey, utcTaskPeriod } from "./daily-task-rules";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown error").replace(/bot\d+:[^/\s]+/gi, "bot[redacted]").slice(0, 500);
}

async function notifyPeriod(periodId: string, date: string, taskCount: number) {
  const db = sql();
  const enabled = await db`SELECT value FROM reward_settings WHERE key='daily_task_notification_enabled'`;
  if (Number(enabled[0]?.value ?? 1) !== 1) {
    await db`UPDATE daily_task_periods SET notification_status='skipped',updated_at=NOW() WHERE id=${periodId}::uuid AND notification_status<>'sent'`;
    return false;
  }
  const acquired = await db`UPDATE daily_task_periods SET notification_status='sending',notification_attempted_at=NOW(),last_error=NULL,updated_at=NOW()
    WHERE id=${periodId}::uuid AND (notification_status IN ('pending','failed') OR (notification_status='sending' AND notification_attempted_at<NOW()-INTERVAL '15 minutes')) RETURNING id`;
  if (!acquired[0]) return false;
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = (process.env.DAILY_TASK_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID)?.trim();
    if (!token || !chatId) throw new Error("Daily-task Telegram destination is not configured.");
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", signal: AbortSignal.timeout(10_000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: `New AIONEX daily missions are live for ${date} UTC. ${taskCount} missions are ready.`, disable_web_page_preview: true }) });
    const body = await response.json().catch(() => ({})) as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (!response.ok || !body.ok) throw new Error(`Telegram notification failed (${response.status}): ${body.description || response.statusText}`);
    await db`UPDATE daily_task_periods SET notification_status='sent',notification_message_id=${String(body.result?.message_id || "")},notified_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=${periodId}::uuid`;
    return true;
  } catch (error) {
    await db`UPDATE daily_task_periods SET notification_status='failed',last_error=${safeError(error)},updated_at=NOW() WHERE id=${periodId}::uuid`;
    throw error;
  }
}

export async function refreshDailyTasks(options: { day?: Date | string; source: string; notify?: boolean }) {
  const period = utcTaskPeriod(options.day);
  const db = sql();
  const run = await db`INSERT INTO daily_task_refresh_runs(period_date,trigger_source,status) VALUES(${period.date}::date,${options.source},'running') RETURNING id`;
  const runId = String(run[0].id);
  try {
    let periodId = "";
      await db`UPDATE daily_task_periods SET status='archived',updated_at=NOW() WHERE status='active' AND period_date<${period.date}::date`;
      const periods = await db`INSERT INTO daily_task_periods(period_date,starts_at,ends_at,status) VALUES(${period.date}::date,${period.startsAt}::timestamptz,${period.endsAt}::timestamptz,'active') ON CONFLICT(period_date) DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status='active',updated_at=NOW() RETURNING id`;
      periodId = String(periods[0].id);
      const templates = await db`SELECT * FROM daily_task_templates WHERE enabled=TRUE ORDER BY sort_order,key`;
      for (const template of templates) {
        const config = { ...((template.verification_config || {}) as Record<string, unknown>), periodDate: period.date, periodStart: period.startsAt, periodEnd: period.endsAt };
        await db`INSERT INTO reward_tasks(external_key,category,task_group,title,description,icon,reward_axp,reward_xp,reward_energy,reward_chest_progress,reward_streak_progress,difficulty,enabled,repeat_mode,verification_mode,verification_config,task_url,starts_at,ends_at,sort_order,daily_period_id,daily_template_id)
          VALUES(${dailyTaskExternalKey(period.date,String(template.key))},${String(template.category)},'daily',${String(template.title)},${String(template.description)},${String(template.icon)},${Number(template.reward_axp)},${Number(template.reward_xp)},${Number(template.reward_energy)},${Number(template.reward_chest_progress)},${Number(template.reward_streak_progress)},${String(template.difficulty)},TRUE,'once',${String(template.verification_mode)},${JSON.stringify(config)}::jsonb,${template.task_url ? String(template.task_url) : null},${period.startsAt}::timestamptz,${period.endsAt}::timestamptz,${Number(template.sort_order)},${periodId}::uuid,${String(template.id)}::uuid) ON CONFLICT(external_key) DO NOTHING`;
      }
      await db`INSERT INTO daily_task_user_progress(period_id,user_id,task_id) SELECT ${periodId}::uuid,u.id,t.id FROM reward_users u JOIN reward_tasks t ON t.daily_period_id=${periodId}::uuid WHERE u.status='active' ON CONFLICT DO NOTHING`;
      const counts = await db`SELECT (SELECT COUNT(*)::int FROM reward_tasks WHERE daily_period_id=${periodId}::uuid) AS tasks,(SELECT COUNT(*)::int FROM daily_task_user_progress WHERE period_id=${periodId}::uuid) AS assignments`;
      let notificationSent = false;
      if (options.notify) notificationSent = await notifyPeriod(periodId, period.date, Number(counts[0].tasks));
      await db`UPDATE daily_task_refresh_runs SET status='success',tasks_generated=${Number(counts[0].tasks)},users_assigned=${Number(counts[0].assignments)},notification_sent=${notificationSent},finished_at=NOW() WHERE id=${runId}::uuid`;
      return { ok: true, runId, periodId, period: period.date, tasks: Number(counts[0].tasks), assignments: Number(counts[0].assignments), notificationSent };
  } catch (error) {
    await db`UPDATE daily_task_refresh_runs SET status='error',error_message=${safeError(error)},finished_at=NOW() WHERE id=${runId}::uuid`;
    throw error;
  }
}

export async function ensureDailyTasksForUser(userId: string) {
  const db = sql();
  const active = await db`SELECT p.id,p.period_date,(SELECT COUNT(*)::int FROM reward_tasks t WHERE t.daily_period_id=p.id) AS tasks FROM daily_task_periods p WHERE p.status='active' AND p.starts_at<=NOW() AND p.ends_at>NOW() LIMIT 1`;
  const result = active[0] && Number(active[0].tasks)>0 ? { periodId: String(active[0].id), period: String(active[0].period_date).slice(0,10) } : await refreshDailyTasks({ source: "user-recovery", notify: false });
  await db`INSERT INTO daily_task_user_progress(period_id,user_id,task_id) SELECT ${result.periodId}::uuid,${userId}::uuid,t.id FROM reward_tasks t WHERE t.daily_period_id=${result.periodId}::uuid ON CONFLICT DO NOTHING`;
  return result;
}

export async function dailyTaskAdminState() {
  const db = sql();
  const [periods, runs, templates] = await Promise.all([
    db`SELECT p.*,(SELECT COUNT(*)::int FROM reward_tasks WHERE daily_period_id=p.id) AS task_count,(SELECT COUNT(*)::int FROM daily_task_user_progress WHERE period_id=p.id) AS assignment_count FROM daily_task_periods p ORDER BY period_date DESC LIMIT 1`,
    db`SELECT * FROM daily_task_refresh_runs ORDER BY started_at DESC LIMIT 10`,
    db`SELECT * FROM daily_task_templates ORDER BY sort_order,key`,
  ]);
  const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { period: periods[0] || null, runs, templates, nextPreview: previewTemplates(templates, tomorrow) };
}

function previewTemplates(templates: readonly Record<string, unknown>[], day: Date | string) {
  const period = utcTaskPeriod(day);
  return templates.filter(template => Boolean(template.enabled)).map(template => ({ externalKey: dailyTaskExternalKey(period.date, String(template.key)), title: String(template.title), category: String(template.category), rewardAxp: Number(template.reward_axp), rewardXp: Number(template.reward_xp), rewardEnergy: Number(template.reward_energy), rewardChestProgress: Number(template.reward_chest_progress), rewardStreakProgress: Number(template.reward_streak_progress), startsAt: period.startsAt, endsAt: period.endsAt }));
}

export async function updateDailyTaskTemplate(id: string, input: Record<string, unknown>, admin: string) {
  const integer = (key: string, max = 100000) => Math.max(0, Math.min(max, Math.trunc(Number(input[key] ?? 0))));
  const rows = await sql()`UPDATE daily_task_templates SET reward_axp=${integer("rewardAxp")},reward_xp=${integer("rewardXp")},reward_energy=${integer("rewardEnergy")},reward_chest_progress=${integer("rewardChestProgress")},reward_streak_progress=${integer("rewardStreakProgress")},enabled=${Boolean(input.enabled)},updated_by=${admin},updated_at=NOW() WHERE id=${id}::uuid RETURNING *`;
  if (!rows[0]) throw new Error("Daily task template not found.");
  await sql()`INSERT INTO aion_admin_audit_logs(admin_username,action,target_type,target_id,after_state) VALUES(${admin},'update_daily_task_template','daily_task_template',${id},${JSON.stringify(rows[0])}::jsonb)`;
  return rows[0];
}
