export const OFFICIAL_LINKS={
 website:"https://aionex-ai.vercel.app",
 telegram:"https://t.me/aionexweb3",
 x:"https://x.com/aionexai",
 youtube:"https://www.youtube.com/@AIONEXAIOfficial",
} as const;
export type SocialProvider="telegram"|"x"|"youtube";
export const SOCIAL_LABELS:Record<SocialProvider,string>={telegram:"Telegram",x:"X",youtube:"YouTube"};
export const ACTIVE_COMMUNITY_PROVIDERS=["telegram","youtube"] as const satisfies readonly SocialProvider[];
export const FUTURE_SOCIAL_SLOTS={x:{enabled:false,url:OFFICIAL_LINKS.x},tiktok:{enabled:false,url:null as string|null}} as const;
