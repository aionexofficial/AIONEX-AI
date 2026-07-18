import {z} from "zod";

export const videoSceneSchema=z.object({
  headline:z.string().trim().min(3).max(72),
  body:z.string().trim().min(12).max(260),
  subtitle:z.string().trim().min(3).max(140),
  visual:z.string().trim().min(8).max(220),
}).strict();

export const videoContentPackageSchema=z.object({
  concept:z.string().trim().min(12).max(280),
  script:z.string().trim().min(120).max(2400),
  title:z.string().trim().min(3).max(100),
  description:z.string().trim().min(20).max(1200),
  telegramCaption:z.string().trim().min(3).max(1024),
  youtubeDescription:z.string().trim().min(20).max(4000),
  hashtags:z.array(z.string().trim().regex(/^#[A-Za-z0-9_]{2,40}$/)).min(3).max(8),
  durationSeconds:z.literal(30),
  scenes:z.array(videoSceneSchema).length(5),
}).strict();

export type VideoContentPackage=z.infer<typeof videoContentPackageSchema>;

export function fallbackVideoContent(day:string):VideoContentPackage{
  return videoContentPackageSchema.parse({
    concept:"AION evolves as verified activity moves through the AIONEX intelligence network.",
    script:"Meet AION, the evolving intelligence at the center of AIONEX. Every verified action is processed by server-authoritative systems. Energy supports deliberate activity, while XP and levels unlock visible evolution. Tasks and referrals connect individual progress to the wider community. Open the official AIONEX Telegram community to begin your journey.",
    title:`AIONEX Daily Signal — ${day}`,
    description:"A concise look at AION, verified progression, and the community-powered AIONEX experience.",
    telegramCaption:"AION is evolving. Explore verified progression, tasks, referrals, and the official AIONEX community.",
    youtubeDescription:"Discover how AION connects server-validated activity, XP, levels, tasks, referrals, and community participation across AIONEX.",
    hashtags:["#AIONEX","#AION","#AIWeb3","#Web3"],
    durationSeconds:30,
    scenes:[
      {headline:"AION AWAKENS",body:"An intelligence core comes online inside the AIONEX network.",subtitle:"Meet the evolving intelligence at the center of AIONEX.",visual:"Luminous AION core, orbital rings, and a deep-space neural grid."},
      {headline:"VERIFIED ENERGY",body:"Every accepted action is validated by server-authoritative systems.",subtitle:"Energy and activity are verified before rewards are applied.",visual:"Energy rails, secure pulses, and authenticated data packets."},
      {headline:"XP BECOMES EVOLUTION",body:"Progress moves through levels and seven visible AION stages.",subtitle:"Build XP, advance levels, and evolve AION over time.",visual:"Seven-stage evolution tunnel with XP arcs and shifting forms."},
      {headline:"COMMUNITY SIGNAL",body:"Tasks and referrals connect personal progress to the network.",subtitle:"Complete verified missions and grow with the community.",visual:"Mission cards, referral nodes, and connected community signals."},
      {headline:"ENTER AIONEX",body:"Continue the journey in the official AIONEX Telegram community.",subtitle:"Join @aionexweb3 and evolve your AION.",visual:"AIONEX wordmark, Telegram signal, and a bright community portal."},
    ],
  });
}
