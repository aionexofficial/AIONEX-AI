export type DailyTaskPeriod = { date: string; startsAt: string; endsAt: string };

export function utcTaskPeriod(input: Date | string = new Date()): DailyTaskPeriod {
  const now = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(now.getTime())) throw new Error("Invalid daily-task date.");
  const date = now.toISOString().slice(0, 10);
  const startsAt = `${date}T00:00:00.000Z`;
  const end = new Date(startsAt);
  end.setUTCDate(end.getUTCDate() + 1);
  return { date, startsAt, endsAt: end.toISOString() };
}

export function dailyTaskExternalKey(date: string, templateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[a-z0-9-]{2,64}$/.test(templateKey)) throw new Error("Invalid daily-task key.");
  return `daily:${date}:${templateKey}`;
}

export function notificationCanBeAcquired(status: string, attemptedAt: Date | null, now = new Date()) {
  if (status === "pending" || status === "failed") return true;
  return status === "sending" && Boolean(attemptedAt && now.getTime() - attemptedAt.getTime() >= 15 * 60_000);
}
