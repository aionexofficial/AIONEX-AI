"use client";
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bot,
  Check,
  ChevronRight,
  CircleUserRound,
  Coins,
  Copy,
  Crown,
  Flame,
  Gift,
  Globe2,
  Home,
  LockKeyhole,
  Pickaxe,
  Rocket,
  Send,
  Share2,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { WalletControls } from "@/app/components/wallet-controls";
import { AionMining } from "@/components/aion/aion-mining";
import { AionOnboarding } from "@/components/aion/aion-onboarding";
import { AionProvider } from "@/components/aion/aion-provider";
import { AionHomeExperience } from "@/components/aion/aion-home-experience";
import { AionAiPresence, AionEvolutionPreview } from "@/components/aion/aion-presence";
import { Markdown } from "@/components/assistant/markdown";
import type { RewardProfile, RewardTask } from "@/lib/rewards/types";

type Leader = {
  id: string;
  displayName: string;
  lifetimeAxp: number;
  loginStreak: number;
  rank: number;
};
type HistoryItem = {
  id: string;
  amount: number;
  xpAwarded: number;
  reason: string;
  createdAt: string;
};
type NewsItem = { title: string; source: string; url: string };
type MiningStats = {
  claims: number;
  earned: number;
  lastClaim: string | null;
  cooldownHours: number;
};
type MetricLeader = {
  id: string;
  displayName: string;
  axp: number;
  xp: number;
  referrals: number;
  mining: number;
  tasks: number;
  rank: number;
};
type ReferralLeader = {
  id: string;
  displayName: string;
  referralCode: string;
  referrals: number;
  rank: number;
};
type NavId = "home" | "mine" | "tasks" | "ai" | "invite" | "wallet" | "profile";
type Overlay = "ai" | "rewards" | "leaderboard" | null;
type ChatMessage = { role: "user" | "assistant"; content: string };

const nav = [
  { id: "home", label: "Home", icon: Home },
  { id: "mine", label: "Mine", icon: Pickaxe },
  { id: "tasks", label: "Tasks", icon: Gift },
  { id: "ai", label: "AION AI", icon: Bot },
  { id: "invite", label: "Invite", icon: Users },
  { id: "profile", label: "Profile", icon: CircleUserRound },
] as const;
const taskFilters = [
  "All",
  "Daily",
  "Social",
  "Community",
  "Events",
  "Referral",
  "Verification",
] as const;
const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};
const particleVectors = Array.from({length:14},(_,i)=>({x:(i%2?1:-1)*(42+(i*17)%88),y:-72-(i*31)%142}));

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 112 : size === "sm" ? 38 : 48;
  return (
    <motion.div
      animate={{ scale: [1, 1.025, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="relative grid shrink-0 place-items-center [transform:translateZ(0)]"
      style={{ width: dim, height: dim }}
    >
      <motion.div
        className="absolute inset-0 rounded-[30%] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/25 via-blue-600/20 to-violet-600/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-[12%] rounded-[28%] border border-white/15 bg-[#07101f]/90" />
      <span
        className={`${size === "lg" ? "text-5xl" : size === "sm" ? "text-base" : "text-xl"} relative font-black italic tracking-[-.12em] text-white`}
      >
        A<span className="text-cyan-300">X</span>
      </span>
    </motion.div>
  );
}

function Glass({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? motion.button : motion.section;
  return (
    <Tag
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`rounded-[26px] border border-white/[.09] bg-gradient-to-br from-white/[.085] to-white/[.025] shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_20px_50px_rgba(0,0,0,.22)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </Tag>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[.25em] text-cyan-300/70">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.4, repeat: Infinity }}
      className={`rounded-xl bg-gradient-to-r from-white/[.035] via-white/[.09] to-white/[.035] ${className}`}
    />
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/[.07] bg-white/[.035]">
        <Icon size={21} className="text-slate-600" />
      </div>
      <p className="mt-3 text-xs font-semibold">{title}</p>
      <p className="mt-1 max-w-[230px] text-[10px] leading-4 text-slate-500">
        {copy}
      </p>
    </div>
  );
}

const AnimatedNumber = memo(function AnimatedNumber({value,className=""}:{value:number;className?:string}){
  const [shown,setShown]=useState(0);const previous=useRef(0);
  useEffect(()=>{const from=previous.current,to=value;if(from===to)return;let frame=0,cancelled=false;const distance=Math.abs(to-from),step=distance<=240?1:Math.max(1,Math.ceil(distance/72));const direction=to>from?1:-1;const tick=()=>{if(cancelled)return;frame+=1;const next=from+direction*Math.min(distance,frame*step);setShown(next);if(next!==to)requestAnimationFrame(tick);else previous.current=to};requestAnimationFrame(tick);return()=>{cancelled=true}},[value]);
  return <span className={className}>{Math.round(shown).toLocaleString()}</span>;
});

const Countdown = memo(function Countdown({until,onReady,className=""}:{until:number;onReady:()=>void;className?:string}){
  const [remaining,setRemaining]=useState(()=>Math.max(0,until-Date.now()));
  useEffect(()=>{const tick=()=>{const next=Math.max(0,until-Date.now());setRemaining(next);if(next===0)onReady()};tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[until,onReady]);
  const seconds=Math.ceil(remaining/1000);const label=remaining===0?"READY":`${String(Math.floor(seconds/3600)).padStart(2,"0")}:${String(Math.floor(seconds%3600/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  return <span className={className}>{label}</span>;
});

function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2400);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.7 }}
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#02040b]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(36,190,255,.18),transparent_30%),radial-gradient(circle_at_50%_55%,rgba(124,58,237,.16),transparent_38%)]" />
      <div className="mini-particles absolute inset-0" />
      <div className="relative flex flex-col items-center">
        <Logo size="lg" />
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-7 text-3xl font-black tracking-[.2em]"
        >
          AIONEX
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-2 text-[10px] uppercase tracking-[.42em] text-cyan-300"
        >
          Intelligence evolves
        </motion.p>
        <div className="mt-10 h-[2px] w-40 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-300 via-blue-500 to-violet-500"
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Welcome({ onOpen }: { onOpen: () => void }) {
  const [step, setStep] = useState(0);
  const slides = [
    { icon: Pickaxe, eyebrow: "Daily mining", title: "Mine your edge.", copy: "Claim AXP and XP every day, build your mining streak, and grow your on-chain reputation.", tone: "from-cyan-300 to-blue-500" },
    { icon: Gift, eyebrow: "Verified rewards", title: "Every action counts.", copy: "Complete ecosystem missions, unlock achievements, and collect special seasonal rewards.", tone: "from-blue-400 to-violet-500" },
    { icon: Users, eyebrow: "Invite system", title: "Grow together.", copy: "Invite friends with your unique link. Both sides earn while your referral level advances.", tone: "from-violet-400 to-fuchsia-500" },
  ];
  const slide = slides[step];
  const Icon = slide.icon;
  const finish = () => { localStorage.setItem("aionex-onboarded", "1"); onOpen(); };
  return (
    <motion.div
      {...pageMotion}
      className="flex min-h-[calc(100dvh-40px)] flex-col justify-between px-5 pb-8 pt-12 text-center"
    >
      <div><div className="flex items-center justify-between"><Logo size="sm"/><button onClick={finish} className="text-[10px] font-semibold text-slate-500">Skip</button></div><AnimatePresence mode="wait"><motion.div key={step} initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}} className="mt-16"><motion.div animate={{y:[0,-8,0],rotate:[0,2,0]}} transition={{duration:3,repeat:Infinity}} className={`mx-auto grid h-28 w-28 place-items-center rounded-[34px] bg-gradient-to-br ${slide.tone} shadow-[0_0_55px_rgba(34,211,238,.2)]`}><Icon size={46} className="text-slate-950"/></motion.div><p className="mt-10 text-[9px] font-bold uppercase tracking-[.28em] text-cyan-300">{slide.eyebrow}</p><h1 className="mt-3 text-4xl font-black leading-none tracking-[-.055em]">{slide.title}</h1><p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-slate-400">{slide.copy}</p></motion.div></AnimatePresence>
      </div>
      <div>
        <div className="mb-6 flex justify-center gap-2">{slides.map((_,i)=><motion.span animate={{width:i===step?28:7,backgroundColor:i===step?"#67e8f9":"#334155"}} key={i} className="h-1.5 rounded-full"/>)}</div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => step < slides.length - 1 ? setStep(step + 1) : finish()}
          className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 p-[1px] shadow-[0_0_40px_rgba(34,211,238,.25)]"
        >
          <span className="flex h-15 items-center justify-center gap-2 rounded-[15px] bg-[#07101b]/25 text-sm font-bold text-white">
            {step < slides.length - 1 ? "Continue" : "Open AIONEX"} <ChevronRight size={17} />
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  color = "cyan",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  color?: "cyan" | "violet" | "amber";
}) {
  const tone =
    color === "violet"
      ? "text-violet-300 bg-violet-400/10"
      : color === "amber"
        ? "text-amber-300 bg-amber-400/10"
        : "text-cyan-300 bg-cyan-400/10";
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export function RewardsDashboard({
  initialProfile,
  initialTasks,
  initialLeaders,
}: {
  initialProfile: RewardProfile | null;
  initialTasks: RewardTask[];
  initialLeaders: Leader[];
}) {
  const [splash, setSplash] = useState(false),
    [theme, setTheme] = useState<"dark" | "light">("dark"),
    [active, setActive] = useState<NavId>("home"),
    [overlay, setOverlay] = useState<Overlay>(null);
  const [profile, setProfile] = useState(initialProfile),
    [tasks, setTasks] = useState(initialTasks),
    [leaders] = useState(initialLeaders),
    [history, setHistory] = useState<HistoryItem[]>([]),
    [news, setNews] = useState<NewsItem[]>([]);
  const [miningStats, setMiningStats] = useState<MiningStats>({
      claims: 0,
      earned: 0,
      lastClaim: null,
      cooldownHours: 24,
    }),
    [metricLeaders, setMetricLeaders] = useState<MetricLeader[]>([]),
    [referralLeaders, setReferralLeaders] = useState<ReferralLeader[]>([]),
    [loading, setLoading] = useState(Boolean(initialProfile));
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [taskFilter, setTaskFilter] = useState<(typeof taskFilters)[number]>("All"),
    [mineReady, setMineReady] = useState(() => !initialProfile?.lastMinedAt || new Date(initialProfile.lastMinedAt).getTime() + 86400000 <= Date.now()),
    [burst, setBurst] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([
      {
        role: "assistant",
        content:
          "I am AION, your evolving intelligence companion. Ask me about AIONEX, missions, rewards, wallets, AI, or crypto education.",
      },
    ]),
    [draft, setDraft] = useState(""),
    [aiBusy, setAiBusy] = useState(false),
    [conversationId, setConversationId] = useState<string | null>(null),
    [leaderScope, setLeaderScope] = useState("Global"),
    [leaderPeriod, setLeaderPeriod] = useState("All time");
  const account = useAccount(),
    { signMessageAsync } = useSignMessage();
  const chatEnd = useRef<HTMLDivElement>(null);
  const telegramAuthAttempted = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [me, taskResult, hist, mining, rankings, referrals] =
      await Promise.all([
        fetch("/api/rewards/me", { cache: "no-store" }),
        fetch("/api/rewards/tasks", { cache: "no-store" }),
        fetch("/api/rewards/history", { cache: "no-store" }),
        fetch("/api/rewards/mining/stats", { cache: "no-store" }),
        fetch("/api/rewards/leaderboards?metric=mining", { cache: "no-store" }),
        fetch("/api/rewards/referrals/leaderboard", { cache: "no-store" }),
      ]);
    if (me.ok) setProfile((await me.json()).profile);
    if (taskResult.ok) setTasks((await taskResult.json()).tasks);
    if (hist.ok) setHistory((await hist.json()).history);
    if (mining.ok) setMiningStats((await mining.json()).stats);
    if (rankings.ok) setMetricLeaders((await rankings.json()).leaders || []);
    if (referrals.ok)
      setReferralLeaders((await referrals.json()).leaders || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("aionex-ai-history");
    if (saved)
      try {
        setChat(JSON.parse(saved) as ChatMessage[]);
      } catch {}
    const webApp = (
      window as typeof window & {
        Telegram?: {
          WebApp?: {
            ready?: () => void;
            expand?: () => void;
            initData?: string;
            setHeaderColor?: (c: string) => void;
            setBackgroundColor?: (c: string) => void;
            colorScheme?: "light" | "dark";
          };
        };
      }
    ).Telegram?.WebApp;
    if (webApp?.colorScheme) setTheme(webApp.colorScheme);
    webApp?.ready?.();
    webApp?.expand?.();
    webApp?.setHeaderColor?.("#02050d");
    webApp?.setBackgroundColor?.("#02050d");
    if (!initialProfile && webApp?.initData && !telegramAuthAttempted.current) {
      telegramAuthAttempted.current = true;
      void fetch("/api/rewards/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: webApp.initData }),
      }).then(async (response) => {
        if (response.ok) await refresh();
        else {
          const body = await response.json().catch(() => ({})) as { error?: string };
          setMessage(body.error || "Telegram authentication failed. Reopen the Mini App and try again.");
        }
      }).catch(() => setMessage("Telegram authentication is temporarily unavailable."));
    }
    void fetch("/api/market-news")
      .then((r) => r.json())
      .then((d) => setNews(d.items || []));
    if (initialProfile) void refresh();
  }, [initialProfile, refresh]);
  useEffect(() => {
    if (chat.length > 1)
      localStorage.setItem(
        "aionex-ai-history",
        JSON.stringify(chat.slice(-30)),
      );
  }, [chat]);
  const authenticatedProfileId = profile?.id;
  useEffect(() => {
    if (!authenticatedProfileId) return;
    void fetch("/api/aion/conversations", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const body = await response.json() as { conversation?: { id: string; messages: ChatMessage[] } | null };
      if (body.conversation?.messages.length) {
        setConversationId(body.conversation.id);
        setChat(body.conversation.messages.map(({ role, content }) => ({ role, content })));
      }
    }).catch(() => undefined);
  }, [authenticatedProfileId]);
  useEffect(
    () => chatEnd.current?.scrollIntoView({ behavior: "auto", block: "end" }),
    [chat],
  );
  const mineUntil=profile?.lastMinedAt?new Date(profile.lastMinedAt).getTime()+86400000:0;
  const nextMine=!mineReady&&mineUntil>Date.now();
  const markMineReady=useCallback(()=>setMineReady(true),[]);
  useEffect(()=>setMineReady(!mineUntil||mineUntil<=Date.now()),[mineUntil]);
  const referralLink = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "AIONEXAIBot"}?start=ref_${profile?.referralCode || "AIONEX"}`;

  async function action(path: string, key: string) {
    setBusy(key);
    setMessage("");
    try {
      if (key === "mine")
        (
          window as typeof window & {
            Telegram?: {
              WebApp?: {
                HapticFeedback?: { impactOccurred?: (style: string) => void };
              };
            };
          }
        ).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("heavy");
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action unavailable");
      if (key === "mine") setBurst((v) => v + 1);
      setMessage(
        key === "mine"
          ? "+100 AXP · +25 XP secured!"
          : key === "checkin"
            ? "Daily bonus claimed."
            : "Mission completed.",
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setBusy("");
    }
  }
  async function taskAction(task: RewardTask) {
    setBusy(task.id);
    try {
      const mode = task.claimStatus === "pending" ? "verify" : "claim";
      const response = await fetch(`/api/rewards/tasks/${task.id}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(
        mode === "verify" ? "Verification complete." : "Mission submitted.",
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mission unavailable",
      );
    } finally {
      setBusy("");
    }
  }
  async function walletAuth() {
    if (!account.address) return setMessage("Connect your wallet first.");
    setBusy("wallet");
    try {
      const nonce = (await fetch("/api/auth/nonce").then((r) => r.json())) as {
        nonce: string;
      };
      const text = `Sign in to AIONEX Rewards\n\nNonce: ${nonce.nonce}`;
      const signature = await signMessageAsync({ message: text });
      const response = await fetch("/api/rewards/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          message: text,
          signature,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      await refresh();
      setMessage("Wallet secured to your AIONEX identity.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Wallet verification failed",
      );
    } finally {
      setBusy("");
    }
  }
  async function sendChat(prompt = draft) {
    if (!prompt.trim() || aiBusy) return;
    const next = [...chat, { role: "user" as const, content: prompt.trim() }];
    setChat(next);
    setDraft("");
    setAiBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          conversationId,
        }),
      });
      if (!response.ok) throw new Error("AI is reconnecting");
      setConversationId(response.headers.get("X-AION-Conversation-ID") || conversationId);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setChat([...next, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setChat([...next, { role: "assistant", content: answer }]);
      }
    } catch (error) {
      setChat([
        ...next,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "AI is unavailable",
        },
      ]);
    } finally {
      setAiBusy(false);
    }
  }
  function go(id: NavId) {
    if(active===id&&!overlay)return;
    (window as typeof window&{Telegram?:{WebApp?:{HapticFeedback?:{selectionChanged?:()=>void}}}}).Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    setOverlay(null);
    setActive(id);
  }

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "All") return true;
    if (taskFilter === "Daily") return task.group === "daily";
    if (taskFilter === "Social") return task.group === "social";
    if (taskFilter === "Community") return task.category.startsWith("telegram");
    if (taskFilter === "Events") return task.group === "special";
    if (taskFilter === "Referral") return task.group === "referral";
    return task.verificationMode !== "system";
  });
  const completed = tasks.filter((t) => t.completed).length;

  const LegacyHomeScreen = () => (
    <motion.div {...pageMotion} className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <p className="text-[9px] uppercase tracking-[.2em] text-cyan-300/70">
              AIONEX V3
            </p>
            <h1 className="text-sm font-semibold">
              Good to see you,{" "}
              {profile?.displayName?.split(" ")[0] || "Explorer"}
            </h1>
          </div>
        </div>
        <button
          onClick={() => setActive("profile")}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5"
        >
          <CircleUserRound size={20} />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[#050814] bg-emerald-400" />
        </button>
      </header>
      <AionHomeExperience profile={profile} tasks={tasks} busy={busy} onMine={() => go("mine")} onTasks={() => go("tasks")} onProfile={() => go("profile")} onCheckIn={() => void action("/api/rewards/check-in", "checkin")} />
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[28px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(6,182,212,.13),rgba(37,99,235,.08)_50%,rgba(124,58,237,.15))] p-5"
      >
        <motion.div
          animate={{ x: [-80, 360] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute -top-12 h-44 w-20 rotate-12 bg-white/[.04] blur-xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />{" "}
            Network live
          </span>
          <h2 className="mt-4 max-w-[270px] text-2xl font-black leading-[1.05] tracking-[-.045em]">
            Mine your edge.
            <br />
            <span className="text-cyan-300">Own your progress.</span>
          </h2>
          <p className="mt-3 max-w-[280px] text-[10px] leading-4 text-slate-400">
            Intelligence, rewards and reputation—synchronized in one daily
            ritual.
          </p>
          <button
            onClick={() => go("mine")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black text-slate-950"
          >
            {nextMine ? "View mining status" : "Claim daily mining"}
            <ChevronRight size={13} />
          </button>
        </div>
      </motion.section>
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      <Glass className="relative overflow-hidden p-5">
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-slate-400">
              Total AXP balance
            </p>
            <button
              onClick={() => go("wallet")}
              className="flex items-center gap-1 text-[10px] text-cyan-300"
            >
              Wallet <ChevronRight size={12} />
            </button>
          </div>
          <motion.p
            key={profile?.axpBalance}
            initial={{ scale: 0.92, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-3 text-4xl font-black tracking-[-.05em]"
          >
            <AnimatedNumber value={profile?.axpBalance || 0}/>
            <span className="ml-2 text-sm font-semibold text-cyan-300">
              AXP
            </span>
          </motion.p>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[.07] pt-4">
            <div>
              <p className="text-[9px] text-slate-500">XP</p>
              <p className="mt-1 text-sm font-semibold"><AnimatedNumber value={profile?.xp || 0}/></p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Level</p>
              <p className="mt-1 text-sm font-semibold">
                {profile?.level || 1}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500">Global rank</p>
              <p className="mt-1 text-sm font-semibold">
                #{profile?.rank || "—"}
              </p>
            </div>
          </div>
        </div>
      </Glass>
      <div className="grid grid-cols-2 gap-3">
        <Glass onClick={() => go("mine")} className="p-4 text-left">
          <StatPill
            icon={Pickaxe}
            label="Mining"
            value={nextMine ? <Countdown until={mineUntil} onReady={markMineReady}/> : "Ready to claim"}
          />
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-300 to-blue-500"
              initial={{scaleX:0}}
              animate={{ scaleX: nextMine ? .42 : 1 }}
              style={{transformOrigin:"left"}}
            />
          </div>
        </Glass>
        <Glass
          onClick={() => void action("/api/rewards/check-in", "checkin")}
          className="p-4 text-left"
        >
          <StatPill
            icon={Flame}
            label="Daily reward"
            value={`${profile?.loginStreak || 0} day streak`}
            color="amber"
          />
          <p className="mt-4 text-[10px] text-amber-200">
            {busy === "checkin" ? "Claiming…" : "Tap to check in +"}
          </p>
        </Glass>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Glass className="p-3 text-center">
          <p className="text-lg font-black text-cyan-300">
            {Math.max(metricLeaders.length, leaders.length)}
          </p>
          <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-500">
            Active miners
          </p>
        </Glass>
        <Glass className="p-3 text-center">
          <p className="text-lg font-black text-violet-300">
            {miningStats.claims}
          </p>
          <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-500">
            Your claims
          </p>
        </Glass>
        <Glass className="p-3 text-center">
          <p className="text-lg font-black text-emerald-300">
            {miningStats.earned}
          </p>
          <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-500">
            AXP mined
          </p>
        </Glass>
      </div>
      <section><SectionTitle title="Quick actions"/><div className="grid grid-cols-4 gap-2">{[{label:"AI",icon:Bot,action:()=>setOverlay("ai")},{label:"Rewards",icon:Gift,action:()=>setOverlay("rewards")},{label:"Wallet",icon:WalletCards,action:()=>go("wallet")},{label:"Rank",icon:Trophy,action:()=>setOverlay("leaderboard")}].map(({label,icon:Icon,action})=><motion.button whileTap={{scale:.92}} key={label} onClick={action} className="flex flex-col items-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.03] py-3 text-[9px] text-slate-300"><Icon size={17} className="text-cyan-300"/>{label}</motion.button>)}</div></section>
      <Glass
        onClick={() => setOverlay("leaderboard")}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
            <Trophy size={19} />
          </div>
          <div>
            <p className="text-sm font-semibold">Leaderboard</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Compete with {leaders.length}+ active explorers
            </p>
          </div>
        </div>
        <ChevronRight size={17} className="text-slate-600" />
      </Glass>
      <section>
        <SectionTitle
          eyebrow="Live intelligence"
          title="AI market summary"
          action={
            <button
              onClick={() => setOverlay("ai")}
              className="text-[10px] text-cyan-300"
            >
              Ask AI
            </button>
          }
        />
        <Glass className="mb-2 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-500 text-slate-950">
              <Bot size={17} />
            </div>
            <div>
              <p className="text-xs font-semibold">
                Market pulse: selective momentum
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                AI detects balanced risk appetite. Watch liquidity, BTC
                dominance and high-volume ecosystem tokens.
              </p>
            </div>
          </div>
        </Glass>
        <div className="space-y-2">
          {(news.length
            ? news
            : [
                {
                  title: "AIONEX Intelligence is scanning global markets.",
                  source: "AIONEX",
                  url: "#",
                },
              ]
          )
            .slice(0, 3)
            .map((item, i) => (
              <motion.a
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                key={item.title}
                href={item.url}
                target="_blank"
                className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.025] p-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-400/10 text-blue-300">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium leading-5">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">
                    {item.source} · Live
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-700" />
              </motion.a>
            ))}
        </div>
      </section>
      <section>
        <SectionTitle eyebrow="AIONEX network" title="Latest announcements" />
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
          {[
            [
              "V3",
              "Phase 2 experience is now live",
              "Explore the upgraded intelligence layer.",
            ],
            [
              "Season 03",
              "Mining league activated",
              "Build streaks and climb the global ranks.",
            ],
          ].map(([tag, title, copy]) => (
            <Glass key={tag} className="w-[78%] shrink-0 p-4">
              <span className="text-[8px] font-bold uppercase tracking-widest text-violet-300">
                {tag}
              </span>
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {copy}
              </p>
            </Glass>
          ))}
        </div>
      </section>
      <section>
        <SectionTitle
          title="Latest rewards"
          action={
            <button
              onClick={() => go("profile")}
              className="text-[10px] text-cyan-300"
            >
              View all
            </button>
          }
        />
        <Glass className="divide-y divide-white/[.05] px-4">
          {history.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center py-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Coins size={14} />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs capitalize">
                  {item.reason.replaceAll("_", " ")}
                </p>
                <p className="text-[9px] text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-xs font-semibold text-emerald-300">
                +{item.amount} AXP
              </p>
            </div>
          ))}
          {!history.length && (
            <div className="py-5 text-center text-xs text-slate-500">
              Your reward story starts here.
            </div>
          )}
        </Glass>
      </section>
    </motion.div>
  );

  const LegacyMineScreen = () => (
    <motion.div
      {...pageMotion}
      className="flex min-h-[calc(100dvh-120px)] flex-col"
    >
      <SectionTitle
        eyebrow="AIONEX mining protocol"
        title="Mine intelligence"
      />
      <Glass className="relative flex flex-1 flex-col items-center overflow-hidden px-5 py-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_50%_48%,rgba(124,58,237,.12),transparent_52%)]" />
        <AnimatePresence>
          {burst > 0 &&
            particleVectors.map((vector, i) => (
              <motion.span
                key={`${burst}-${i}`}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
                animate={{
                  opacity: 0,
                  x: vector.x,
                  y: vector.y,
                  scale: 1.2,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4 }}
                className="absolute left-1/2 top-[45%] z-20 text-sm text-cyan-200"
              >
                {i % 3 === 0 ? "+XP" : "✦"}
              </motion.span>
            ))}
        </AnimatePresence>
        <div className="relative z-10 flex w-full flex-1 flex-col items-center">
          <div className="w-full">
            <div className="flex justify-between text-[9px]">
              <span className="flex items-center gap-1 text-amber-300">
                <Zap size={13} /> Energy
              </span>
              <span className="text-slate-400">100 / 100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{transformOrigin:"left"}}
                className="h-full bg-gradient-to-r from-amber-300 to-cyan-300"
              />
            </div>
          </div>
          <div className="relative my-auto grid h-64 w-64 place-items-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-dashed border-cyan-300/20"
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              className="absolute inset-8 rounded-full bg-cyan-400/10 blur-xl"
            />
            <motion.button
              disabled={!profile}
              onClick={() => window.location.assign("/mining")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.91 }}
              className="relative grid h-40 w-40 place-items-center rounded-full border border-cyan-200/30 bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 p-[2px] shadow-[0_0_60px_rgba(34,211,238,.28)] disabled:saturate-50"
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-[#07101b]/90">
                <span>
                  <Pickaxe className="mx-auto text-cyan-200" size={38} />
                  <span className="mt-2 block text-sm font-black uppercase tracking-[.18em]">
                    {nextMine ? "View" : "Start"}
                  </span>
                  <span className="mt-1 block text-[9px] text-violet-300">
                    Server-validated session
                  </span>
                </span>
              </span>
            </motion.button>
          </div>
          <p className="text-[10px] uppercase tracking-[.22em] text-slate-500">
            Secure mining status
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-wider">
            {nextMine ? <Countdown until={mineUntil} onReady={markMineReady}/> : "READY"}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Open the live miner to start, stop, and follow rewards in real time.
          </p>
          <div className="mt-7 grid w-full grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[.035] p-3">
              <p className="text-[9px] text-slate-500">Claims</p>
              <p className="mt-1 text-sm font-semibold">{miningStats.claims}</p>
            </div>
            <div className="rounded-2xl bg-white/[.035] p-3">
              <p className="text-[9px] text-slate-500">Earned</p>
              <p className="mt-1 text-sm font-semibold">{miningStats.earned}</p>
            </div>
            <div className="rounded-2xl bg-white/[.035] p-3">
              <p className="text-[9px] text-slate-500">Streak</p>
              <p className="mt-1 text-sm font-semibold">
                {profile?.miningStreak || 0}d
              </p>
            </div>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/15 bg-violet-400/[.07] py-3 text-xs text-violet-200">
            <Rocket size={15} /> Boost center · 1.0x active
          </button>
        </div>
      </Glass>
      <section className="mt-6">
        <SectionTitle title="Mining history" />
        <Glass className="divide-y divide-white/[.05] px-4">
          {history
            .filter((item) => item.reason === "mining")
            .slice(0, 5)
            .map((item) => (
              <div key={item.id} className="flex items-center py-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <Pickaxe size={14} />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-xs">Daily mining claim</p>
                  <p className="text-[9px] text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-cyan-300">+{item.amount} AXP</p>
                  <p className="text-[9px] text-violet-300">
                    +{item.xpAwarded} XP
                  </p>
                </div>
              </div>
            ))}
          {!history.some((item) => item.reason === "mining") && (
            <EmptyState
              icon={Pickaxe}
              title="No mining history yet"
              copy="Your first successful daily claim will appear here."
            />
          )}
        </Glass>
      </section>
    </motion.div>
  );

  const TasksScreen = () => (
    <motion.div {...pageMotion}>
      <SectionTitle
        eyebrow="Earn · Explore · Grow"
        title="Mission control"
        action={
          <span className="text-[10px] text-cyan-300">
            {completed}/{tasks.length}
          </span>
        }
      />
      <Glass className="mb-5 p-4">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-400">Mission progress</span>
          <span className="font-semibold text-cyan-300">
            {tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%`,
            }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-500"
          />
        </div>
      </Glass>
      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
        {taskFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setTaskFilter(filter)}
            className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold transition ${taskFilter === filter ? "bg-white text-slate-950" : "border border-white/[.08] bg-white/[.03] text-slate-400"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredTasks.map((task, i) => (
          <motion.article
            key={task.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Glass
              className={`p-4 ${task.completed ? "border-emerald-300/15" : task.claimStatus === "pending" ? "border-amber-300/15" : ""}`}
            >
              <div className="flex gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/15 to-violet-500/15 text-xl">
                  {task.icon || "✦"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                      {task.category.replaceAll("_", " ")}
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] uppercase text-slate-500">
                      {task.difficulty}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold">{task.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                    {task.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: task.completed ? 1 : task.claimStatus === "pending" ? .65 : .12 }} style={{transformOrigin:"left"}} className={`h-full ${task.completed ? "bg-emerald-400" : task.claimStatus === "pending" ? "bg-amber-300" : "bg-gradient-to-r from-cyan-300 to-violet-500"}`} />
                    </div>
                    <span className="text-[8px] text-slate-500">{task.completed ? "100%" : task.claimStatus === "pending" ? "65%" : "0%"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-cyan-300">
                        +{task.rewardAxp} AXP
                      </span>
                      <span className="text-violet-300">
                        +{task.rewardXp} XP
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {task.taskUrl && (
                        <a
                          href={task.taskUrl}
                          target="_blank"
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px]"
                        >
                          Open
                        </a>
                      )}
                      <button
                        disabled={
                          !profile || task.completed || busy === task.id
                        }
                        onClick={() => void taskAction(task)}
                        className={`rounded-lg px-3 py-1.5 text-[9px] font-bold ${task.completed ? "bg-emerald-400/10 text-emerald-300" : task.claimStatus === "pending" ? "bg-amber-400/10 text-amber-300" : "bg-cyan-300 text-slate-950"}`}
                      >
                        {busy === task.id
                          ? "…"
                          : task.completed
                            ? "Completed"
                            : task.claimStatus === "pending"
                              ? "Verify"
                              : "Claim"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Glass>
          </motion.article>
        ))}
        {!filteredTasks.length && <EmptyState icon={Target} title="No missions in this category" copy="New verified missions are added throughout each season." />}
      </div>
    </motion.div>
  );

  const InviteScreen = () => (
    <motion.div {...pageMotion}>
      <SectionTitle eyebrow="Grow the network" title="Invite & earn" />
      <Glass className="relative overflow-hidden p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.18),transparent_48%)]" />
        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-400 to-blue-500 shadow-[0_0_35px_rgba(139,92,246,.25)]">
            <Users size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight">
            Build your inner circle.
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-400">
            You earn 100 AXP. Your friend starts with 50 AXP. Everyone moves
            forward.
          </p>
          <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-3 shadow-[0_0_35px_rgba(255,255,255,.1)]">
            <QRCodeCanvas
              value={referralLink}
              size={150}
              bgColor="#ffffff"
              fgColor="#07101b"
              level="H"
            />
          </div>
          <p className="mt-5 text-[9px] uppercase tracking-widest text-slate-500">
            Your referral code
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-[.15em] text-violet-200">
            {profile?.referralCode || "LOCKED"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                void navigator.clipboard.writeText(referralLink);
                setMessage("Referral link copied.");
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs font-bold text-slate-950"
            >
              <Copy size={15} /> Copy link
            </button>
            <button
              onClick={() =>
                void navigator.share?.({
                  title: "Join AIONEX",
                  text: "Mine, learn and earn AXP with me.",
                  url: referralLink,
                })
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold"
            >
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      </Glass>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Glass className="p-3 text-center">
          <p className="text-xl font-bold">{profile?.referralCount || 0}</p>
          <p className="mt-1 text-[9px] text-slate-500">Friends</p>
        </Glass>
        <Glass className="p-3 text-center">
          <p className="text-xl font-bold text-cyan-300">
            {(profile?.referralCount || 0) * 100}
          </p>
          <p className="mt-1 text-[9px] text-slate-500">AXP earned</p>
        </Glass>
        <Glass className="p-3 text-center">
          <p className="text-xl font-bold text-violet-300">
            #{profile?.rank || "—"}
          </p>
          <p className="mt-1 text-[9px] text-slate-500">Rank</p>
        </Glass>
      </div>
      <section className="mt-6">
        <SectionTitle title="Referral milestones" />
        <div className="space-y-2">
          {[
            [1, "First signal", 100],
            [5, "Core network", 500],
            [25, "Ambassador", 2500],
          ].map(([count, label, reward]) => (
            <Glass key={String(label)} className="flex items-center p-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-xl ${(profile?.referralCount || 0) >= Number(count) ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-slate-600"}`}
              >
                {(profile?.referralCount || 0) >= Number(count) ? (
                  <Check size={16} />
                ) : (
                  <LockKeyhole size={15} />
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[9px] text-slate-500">
                  Invite {count} friend{Number(count) > 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-[10px] text-cyan-300">+{reward} AXP</span>
            </Glass>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <SectionTitle eyebrow="Network leaders" title="Top invited users" />
        <Glass className="divide-y divide-white/[.05] px-4">
          {referralLeaders.slice(0, 5).map((user) => <div key={user.id} className="flex items-center py-3"><span className="w-7 text-[10px] font-bold text-violet-300">#{user.rank}</span><div className="grid h-8 w-8 place-items-center rounded-full bg-violet-400/10 text-xs font-bold">{user.displayName[0]}</div><p className="ml-3 flex-1 truncate text-xs">{user.displayName}</p><p className="text-[10px] text-cyan-300">{user.referrals} invites</p></div>)}
          {!referralLeaders.length && <EmptyState icon={Users} title="The referral race is open" copy="Invite your first explorer and become an early network leader." />}
        </Glass>
      </section>
    </motion.div>
  );

  const AiScreen = () => (
    <motion.div
      {...pageMotion}
      className="flex min-h-[calc(100dvh-120px)] flex-col"
    >
      <header className="mb-4 flex items-center gap-3">
        <AionAiPresence speaking={aiBusy} />
        <div>
          <h1 className="text-sm font-semibold">AION · Personal Intelligence</h1>
          <p className="text-[9px] text-emerald-300">
            Online · Crypto native AI
          </p>
        </div>
      </header>
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {[
          { icon: Coins, text: "Analyze crypto" },
          { icon: WalletCards, text: "Review portfolio" },
          { icon: Globe2, text: "Market outlook" },
        ].map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => void sendChat(text)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.035] px-3 py-2 text-[9px] text-slate-300"
          >
            <Icon size={12} className="text-cyan-300" />
            {text}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
        {["BTC · Momentum", "ETH · Accumulation", "SUI · Trending", "USDT · Stable"].map((token, index) => <button key={token} onClick={() => void sendChat(`Give me a concise professional analysis of ${token.split(" · ")[0]}`)} className="shrink-0 rounded-2xl border border-white/[.07] bg-gradient-to-br from-white/[.06] to-white/[.02] px-3 py-2.5 text-left"><p className="text-[10px] font-semibold">{token}</p><p className={`mt-1 text-[8px] ${index === 3 ? "text-slate-500" : "text-emerald-300"}`}>{index === 3 ? "Low volatility" : "+ AI signal"}</p></button>)}
      </div>
      <Glass className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {chat.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[86%] rounded-2xl px-3.5 py-3 text-xs leading-5 ${item.role === "user" ? "rounded-br-md bg-gradient-to-br from-blue-500 to-violet-600 text-white" : "rounded-bl-md border border-white/[.07] bg-white/[.045] text-slate-300"}`}
              >
                {item.content ? <Markdown content={item.content} /> : (
                  <span className="inline-flex gap-1">
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:.15s]" />
                    <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:.3s]" />
                  </span>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={chatEnd} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendChat();
          }}
          className="flex gap-2 border-t border-white/[.07] p-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask AIONEX anything…"
            className="min-w-0 flex-1 rounded-xl border border-white/[.06] bg-white/[.04] px-3 text-xs outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
          />
          <button
            disabled={aiBusy || !draft.trim()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-300 text-slate-950 disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </form>
      </Glass>
    </motion.div>
  );

  const RewardsScreen = () => (
    <motion.div {...pageMotion}>
      <button onClick={() => setOverlay(null)} className="mb-5 text-[10px] text-cyan-300">← Back to AIONEX</button>
      <SectionTitle eyebrow="Season 03 vault" title="Rewards center" />
      <Glass className="relative overflow-hidden p-5"><div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-300/15 blur-3xl"/><div className="relative flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-orange-500 text-slate-950"><Gift size={27}/></div><div className="flex-1"><p className="text-[9px] uppercase tracking-widest text-amber-300">Daily reward</p><h2 className="mt-1 text-lg font-bold">Keep the streak alive</h2><p className="mt-1 text-[10px] text-slate-500">Current streak: {profile?.loginStreak || 0} days</p></div></div><button onClick={()=>void action("/api/rewards/check-in","checkin")} className="mt-5 w-full rounded-2xl bg-white py-3 text-xs font-black text-slate-950">Claim daily reward</button></Glass>
      <div className="mt-3 grid grid-cols-2 gap-3"><Glass className="relative overflow-hidden p-4 text-center"><motion.div animate={{rotate:360}} transition={{duration:12,repeat:Infinity,ease:"linear"}} className="mx-auto grid h-16 w-16 place-items-center rounded-full border-4 border-dashed border-violet-300/40"><Star size={24} className="text-violet-300"/></motion.div><p className="mt-3 text-sm font-semibold">Lucky Spin</p><p className="mt-1 text-[9px] text-slate-500">Season reward · Soon</p></Glass><Glass className="p-4 text-center"><motion.div animate={{y:[0,-5,0]}} transition={{duration:2,repeat:Infinity}} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300/20 to-violet-500/20"><Gift size={27} className="text-cyan-300"/></motion.div><p className="mt-3 text-sm font-semibold">Mystery Box</p><p className="mt-1 text-[9px] text-slate-500">Unlock at level 5</p></Glass></div>
      <section className="mt-6"><SectionTitle title="Special rewards"/><Glass className="divide-y divide-white/[.05] px-4">{[{icon:Trophy,title:"Top miner bonus",copy:"Finish the season in the top 100"},{icon:Users,title:"Referral champion",copy:"Invite 25 verified explorers"},{icon:Award,title:"Mission master",copy:"Complete every special mission"}].map(({icon:Icon,title,copy})=><div key={title} className="flex items-center py-4"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/10"><Icon size={16} className="text-violet-300"/></div><div className="ml-3 flex-1"><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[9px] text-slate-500">{copy}</p></div><LockKeyhole size={14} className="text-slate-700"/></div>)}</Glass></section>
    </motion.div>
  );

  const ProfileScreen = () => (
    <motion.div {...pageMotion}>
      <div className="flex flex-col items-center pt-3">
        <div className="relative">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 p-[2px]">
            <div className="grid h-full w-full place-items-center rounded-full bg-[#07101b] text-3xl font-black">
              {profile?.displayName?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300 to-blue-400 px-3 py-1 text-[9px] font-black text-slate-950">
            LVL {profile?.level || 1}
          </span>
        </div>
        <h1 className="mt-5 text-xl font-bold">
          {profile?.displayName || "AIONEX Explorer"}
        </h1>
        <p className="mt-1 text-[10px] text-slate-500">
          Global rank #{profile?.rank || "—"} · AIONEX Citizen
        </p>
      </div>
      <AionEvolutionPreview />
      <Glass className="mt-6 p-4">
        <div className="flex justify-between text-[10px]">
          <span>Level progress</span>
          <span className="text-cyan-300">
            <AnimatedNumber value={profile?.xp || 0}/> / {(profile?.level || 1) * 500} XP
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: Math.min(1, ((profile?.xp || 0) % 500) / 500),
            }}
            style={{transformOrigin:"left"}}
            className="h-full bg-gradient-to-r from-cyan-300 to-violet-500"
          />
        </div>
      </Glass>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Glass className="p-4">
          <StatPill
            icon={Coins}
            label="Lifetime AXP"
            value={<AnimatedNumber value={profile?.lifetimeAxp || 0}/>}
          />
        </Glass>
        <Glass className="p-4">
          <StatPill
            icon={Pickaxe}
            label="Mining streak"
            value={`${profile?.miningStreak || 0} claims`}
            color="violet"
          />
        </Glass>
        <Glass className="p-4">
          <StatPill
            icon={Flame}
            label="Daily streak"
            value={`${profile?.loginStreak || 0} days`}
            color="amber"
          />
        </Glass>
        <Glass className="p-4">
          <StatPill
            icon={Target}
            label="Missions"
            value={`${profile?.completedTasks || 0} complete`}
          />
        </Glass>
      </div>
      <Glass className="mt-3 flex items-center justify-between p-4">
        <StatPill icon={Users} label="Referral network" value={`${profile?.referralCount || 0} invited · ${(profile?.referralCount || 0) * 100} AXP`} color="violet" />
        <button onClick={() => go("invite")} className="rounded-xl border border-white/[.07] px-3 py-2 text-[9px] text-cyan-300">Grow</button>
      </Glass>
      <section className="mt-7">
        <SectionTitle
          eyebrow="Proof of progress"
          title="Achievements & badges"
        />
        <div className="grid grid-cols-3 gap-2">
          {(profile?.badges || []).slice(0, 6).map((badge) => (
            <Glass key={badge.slug} className="p-3 text-center">
              <span className="text-2xl">{badge.icon}</span>
              <p className="mt-2 truncate text-[9px] font-semibold">
                {badge.name}
              </p>
            </Glass>
          ))}
          {!profile?.badges.length &&
            [Award, Crown, Star].map((Icon, i) => (
              <Glass key={i} className="p-3 text-center opacity-45">
                <Icon className="mx-auto text-slate-500" size={23} />
                <p className="mt-2 text-[9px] text-slate-500">Locked</p>
              </Glass>
            ))}
        </div>
      </section>
      <div className="mt-7 space-y-2">
        <button
          onClick={() => go("wallet")}
          className="flex w-full items-center rounded-2xl border border-white/[.07] bg-white/[.03] p-4 text-left"
        >
          <WalletCards size={18} className="text-cyan-300" />
          <span className="ml-3 flex-1 text-xs">Wallet & assets</span>
          <ChevronRight size={15} className="text-slate-600" />
        </button>
        <button
          onClick={() => setOverlay("leaderboard")}
          className="flex w-full items-center rounded-2xl border border-white/[.07] bg-white/[.03] p-4 text-left"
        >
          <Trophy size={18} className="text-violet-300" />
          <span className="ml-3 flex-1 text-xs">Global leaderboard</span>
          <ChevronRight size={15} className="text-slate-600" />
        </button>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex w-full items-center rounded-2xl border border-white/[.07] bg-white/[.03] p-4 text-left"><Sparkles size={18} className="text-amber-300"/><span className="ml-3 flex-1 text-xs">Appearance</span><span className="text-[9px] capitalize text-slate-500">{theme} mode</span></button>
      </div>
    </motion.div>
  );

  const WalletOverlay = () => (
    <motion.div {...pageMotion}>
      <button
        onClick={() => go("home")}
        className="mb-5 text-[10px] text-cyan-300"
      >
        ← Back to AIONEX
      </button>
      <SectionTitle eyebrow="Multi-chain vault" title="Wallet" />
      <Glass className="relative overflow-hidden p-5">
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">
            Estimated portfolio
          </p>
          <p className="mt-2 text-3xl font-black">$0.00</p>
          <p className="mt-1 text-[10px] text-emerald-300">
            Secure multi-chain view
          </p>
          <div className="mt-5">
            <WalletControls />
          </div>
          {account.address && (
            <button
              onClick={() => void walletAuth()}
              disabled={busy === "wallet"}
              className="mt-3 w-full rounded-xl bg-cyan-300 py-3 text-xs font-bold text-slate-950"
            >
              {busy === "wallet" ? "Securing…" : "Verify wallet identity"}
            </button>
          )}
        </div>
      </Glass>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[{ label: "Withdraw", status: "Locked", icon: LockKeyhole }, { label: "Deposit", status: account.address ? "Ready" : "Connect", icon: WalletCards }, { label: "Claims", status: `${history.length}`, icon: Gift }].map(({ label, status, icon: Icon }) => <Glass key={label} className="p-3 text-center"><Icon size={15} className="mx-auto text-cyan-300"/><p className="mt-2 text-[9px] font-semibold">{label}</p><p className="mt-1 text-[8px] text-slate-500">{status}</p></Glass>)}
      </div>
      <section className="mt-6">
        <SectionTitle title="Assets" />
        <div className="space-y-2">
          {[
            [
              "A",
              "AIONEX",
              "AXP",
              profile?.axpBalance || 0,
              "from-cyan-300 to-blue-500",
            ],
            ["₮", "Tether", "USDT", 0, "from-emerald-300 to-emerald-600"],
            ["Ξ", "Ethereum", "ETH", 0, "from-blue-300 to-violet-500"],
            ["S", "Sui", "SUI", 0, "from-cyan-200 to-blue-600"],
          ].map(([symbol, name, ticker, balance, tone]) => (
            <Glass key={String(ticker)} className="flex items-center p-4">
              <div
                className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${tone} text-sm font-black text-slate-950`}
              >
                {symbol}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-semibold">{name}</p>
                <p className="text-[9px] text-slate-500">{ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">
                  {Number(balance).toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-500">—</p>
              </div>
            </Glass>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <SectionTitle title="Transactions" />
        <Glass className="divide-y divide-white/[.05] px-4">
          {history.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center py-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Coins size={14} />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs capitalize">
                  {item.reason.replaceAll("_", " ")}
                </p>
                <p className="text-[9px] text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-xs text-emerald-300">+{item.amount} AXP</p>
            </div>
          ))}
          {!history.length && <EmptyState icon={Coins} title="No wallet activity" copy="Reward claims, deposits and withdrawals will appear here." />}
        </Glass>
      </section>
    </motion.div>
  );

  const LeaderboardOverlay = () => (
    <motion.div {...pageMotion}>
      <button
        onClick={() => setOverlay(null)}
        className="mb-5 text-[10px] text-cyan-300"
      >
        ← Back to AIONEX
      </button>
      <SectionTitle eyebrow="Season 03" title="Leaderboard" />
      <div className="mb-5 flex rounded-xl bg-white/[.035] p-1">
        {["Global", "Friends", "Country"].map((label) => (
          <button
            key={label}
            onClick={()=>setLeaderScope(label)}
            className={`flex-1 rounded-lg py-2 text-[10px] font-semibold ${leaderScope === label ? "bg-white text-slate-950" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {["Weekly","Monthly","All time"].map(period=><button key={period} onClick={()=>setLeaderPeriod(period)} className={`shrink-0 rounded-full px-4 py-2 text-[9px] font-semibold ${leaderPeriod===period?"bg-violet-400/15 text-violet-200":"border border-white/[.07] text-slate-500"}`}>{period}</button>)}
      </div>
      <div className="mb-7 flex items-end justify-center gap-3">
        {[leaders[1], leaders[0], leaders[2]].map(
          (user, i) =>
            user && (
              <div
                key={user.id}
                className={`flex flex-1 flex-col items-center ${i === 1 ? "pb-5" : ""}`}
              >
                <div
                  className={`grid rounded-full bg-gradient-to-br p-[2px] ${i === 1 ? "h-20 w-20 from-amber-200 to-amber-500" : "h-16 w-16 from-cyan-300 to-violet-500"}`}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-[#08101d] text-lg font-bold">
                    {user.displayName[0]}
                  </div>
                </div>
                <p className="mt-2 max-w-full truncate text-[10px] font-semibold">
                  {user.displayName}
                </p>
                <p className="text-[9px] text-cyan-300">
                  {user.lifetimeAxp.toLocaleString()} AXP
                </p>
                <span className="mt-1 text-lg">
                  {i === 1 ? "🥇" : i === 0 ? "🥈" : "🥉"}
                </span>
              </div>
            ),
        )}
      </div>
      <Glass className="divide-y divide-white/[.05] px-4">
        {leaders.slice(3).map((user) => (
          <motion.div initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} key={`${leaderScope}-${leaderPeriod}-${user.id}`} className="flex items-center py-3">
            <span className="w-8 text-xs font-bold text-slate-500">
              #{user.rank}
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-xs font-bold">
              {user.displayName[0]}
            </div>
            <p className="ml-3 flex-1 truncate text-xs">{user.displayName}</p>
            <p className="text-[10px] font-semibold text-cyan-300">
              {user.lifetimeAxp.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </Glass>
    </motion.div>
  );

  const screens: Record<NavId, React.ReactNode> = {
    home: <AionHomeExperience profile={profile} tasks={tasks} busy={busy} onMine={() => go("mine")} onTasks={() => go("tasks")} onProfile={() => go("profile")} onCheckIn={() => void action("/api/rewards/check-in", "checkin")} />,
    mine: <AionMining onAuthoritativeUpdate={refresh} />,
    tasks: TasksScreen(),
    ai: AiScreen(),
    invite: InviteScreen(),
    wallet: WalletOverlay(),
    profile: ProfileScreen(),
  };
  void Welcome;
  void LegacyHomeScreen;
  void LegacyMineScreen;
  if (splash)
    return (
      <AnimatePresence>
        <Splash onDone={() => setSplash(false)} />
      </AnimatePresence>
    );
  return (
    <AionProvider authenticated={Boolean(profile)}>
    <AionOnboarding />
    <main className={`mini-app ${theme === "light" ? "light" : ""} min-h-dvh overflow-x-hidden bg-[#03050c] text-white`}>
      <div className="mini-particles pointer-events-none fixed inset-0 opacity-50" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,.1),transparent_30%),radial-gradient(circle_at_100%_45%,rgba(124,58,237,.09),transparent_35%)]" />
      <div className="relative mx-auto min-h-dvh w-full max-w-[480px] px-5 pb-28 pt-[max(20px,env(safe-area-inset-top))]">
        {message && (
          <motion.button
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setMessage("")}
            className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-50 w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 rounded-2xl border border-cyan-300/15 bg-[#0a1625]/95 px-4 py-3 text-left text-xs text-cyan-100 shadow-2xl backdrop-blur-xl"
          >
            {message}
          </motion.button>
        )}
        {overlay === "ai" ? AiScreen() : overlay === "rewards" ? RewardsScreen() : overlay === "leaderboard" ? LeaderboardOverlay() : Object.entries(screens).map(([id, screen]) => <div key={id} hidden={active !== id} aria-hidden={active !== id}>{screen}</div>)}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-white/[.08] bg-[#060a13]/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-20px_50px_rgba(0,0,0,.35)] backdrop-blur-2xl">
        <div className="grid grid-cols-6">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`relative flex flex-col items-center gap-1 py-1.5 text-[8px] transition ${active === id && !overlay ? "text-cyan-300" : "text-slate-600"}`}
            >
              {active === id && !overlay && (
                <motion.span
                  className="absolute -top-2 h-[2px] w-8 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]"
                />
              )}
              <Icon
                size={19}
                strokeWidth={active === id && !overlay ? 2.5 : 1.8}
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
    </AionProvider>
  );
}
