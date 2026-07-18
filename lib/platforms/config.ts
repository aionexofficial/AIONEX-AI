export const PUBLICATION_PLATFORMS={
  telegram:{enabled:true,configuredBy:"TELEGRAM_CHANNEL_ID"},
  youtube:{enabled:true,configuredBy:"GOOGLE_CLIENT_ID"},
  x:{enabled:false,configuredBy:"X_ACCESS_TOKEN"},
  tiktok:{enabled:false,configuredBy:"TIKTOK_ACCESS_TOKEN"},
} as const;

export type PublicationPlatform=keyof typeof PUBLICATION_PLATFORMS;
