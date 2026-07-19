"use client";

import { useCallback, useEffect, useState } from "react";

type Chest = {
  key: string;
  name: string;
  cost_axp: number;
  opened_today: number;
};
type Milestone = {
  key: string;
  requiredXp: number;
  axp?: number;
  xp?: number;
  item?: string;
};
type Season = {
  key: string;
  name: string;
  season_xp: number;
  milestones: Milestone[];
  claimed_rewards: string[];
};
type Achievement = {
  key: string;
  name: string;
  reward_config: Record<string, unknown>;
  claimed: boolean;
};
type Overview = {
  chests: Chest[];
  dailyChestLimit: number;
  prestige: {
    prestige_count: number;
    permanent_bonus_bps: number;
    level: number;
    required_level: number;
  } | null;
  seasons: Season[];
  seasonAchievements: Achievement[];
};

export function GameplayPanel() {
  const [data, setData] = useState<Overview | null>(null),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/aion/gameplay", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);
  async function action(url: string, body: Record<string, unknown>) {
    setMessage("Processing verified reward...");
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      payload = await response.json();
    setMessage(
      response.ok
        ? "Reward synchronized successfully."
        : payload.error || "Action failed.",
    );
    if (response.ok) await load();
  }
  if (!data) return null;
  return (
    <section className="border-t border-white/10 bg-[#020711] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] uppercase tracking-[.22em] text-cyan-300">
          AION live operations
        </p>
        <h2 className="mt-2 text-3xl font-black">
          Chests, prestige and seasons
        </h2>
        {message && (
          <p role="status" className="mt-3 text-xs text-cyan-200">
            {message}
          </p>
        )}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-[#081321] p-5">
            <h3 className="font-bold">Mystery chests</h3>
            {data.chests.map((chest) => (
              <div
                key={chest.key}
                className="mt-4 rounded-2xl border border-white/10 p-4"
              >
                <p>{chest.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {chest.cost_axp} AXP &middot; {chest.opened_today}/
                  {data.dailyChestLimit} today
                </p>
                <button
                  onClick={() =>
                    void action("/api/aion/chests", {
                      chestKey: chest.key,
                      idempotencyKey: crypto.randomUUID(),
                    })
                  }
                  className="mt-3 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950"
                >
                  Open chest
                </button>
              </div>
            ))}
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#081321] p-5">
            <h3 className="font-bold">Prestige</h3>
            <p className="mt-3 text-sm text-slate-400">
              Prestige {data.prestige?.prestige_count || 0} &middot; permanent bonus{" "}
              {((data.prestige?.permanent_bonus_bps || 0) / 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Requires level {data.prestige?.required_level || 100}. Progression
              resets; permanent mining power remains.
            </p>
            <button
              disabled={
                !data.prestige ||
                data.prestige.level < data.prestige.required_level
              }
              onClick={() => void action("/api/aion/prestige", {})}
              className="mt-4 rounded-xl bg-violet-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40"
            >
              Prestige now
            </button>
          </article>
          <article className="rounded-3xl border border-white/10 bg-[#081321] p-5">
            <h3 className="font-bold">Active season</h3>
            {data.seasons.map((season) => (
              <div key={season.key} className="mt-3">
                <p>
                  {season.name} &middot; {season.season_xp} XP
                </p>
                {season.milestones.map((reward) => (
                  <button
                    key={reward.key}
                    disabled={
                      Number(season.season_xp) < reward.requiredXp ||
                      season.claimed_rewards.includes(reward.key)
                    }
                    onClick={() =>
                      void action("/api/aion/seasons/claim", {
                        seasonKey: season.key,
                        rewardKey: reward.key,
                      })
                    }
                    className="mt-2 block w-full rounded-xl border border-white/10 p-3 text-left text-xs disabled:opacity-40"
                  >
                    <b>{reward.requiredXp} XP</b> &middot; {reward.axp || 0} AXP{" "}
                    {reward.xp ? ` / ${reward.xp} XP` : ""}{" "}
                    {reward.item ? ` / ${reward.item}` : ""}
                  </button>
                ))}
              </div>
            ))}
            {data.seasonAchievements.map((item) => (
              <button
                key={item.key}
                disabled={item.claimed}
                onClick={() =>
                  void action("/api/aion/seasons/claim", {
                    type: "achievement",
                    achievementKey: item.key,
                  })
                }
                className="mt-3 block w-full rounded-xl border border-violet-300/20 p-3 text-left text-xs disabled:opacity-40"
              >
                <b>{item.name}</b>
                <span className="block text-slate-500">
                  {item.claimed ? "Claimed" : "Verify and claim achievement"}
                </span>
              </button>
            ))}
          </article>
        </div>
      </div>
    </section>
  );
}
