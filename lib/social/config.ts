export const OFFICIAL_LINKS={
 website:"https://aionex-ai.vercel.app",
 telegram:"https://t.me/aionexweb3",
 x:"https://x.com/aionexai",
 youtube:"https://www.youtube.com/@AIONEXAIOfficial",
} as const;
export type SocialProvider="telegram"|"x"|"youtube";
export const SOCIAL_LABELS:Record<SocialProvider,string>={telegram:"Telegram",x:"X",youtube:"YouTube"};
