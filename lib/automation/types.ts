export type PostStatus = "draft" | "approved" | "published" | "failed";
export type DeliveryStatus = "pending" | "published" | "failed" | "skipped";

export type AutomationPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  socialText: string;
  status: PostStatus;
  scheduledFor: string;
  publishedAt: string | null;
  telegramStatus: DeliveryStatus;
  telegramPostId: string | null;
  xStatus: DeliveryStatus;
  xPostId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};
