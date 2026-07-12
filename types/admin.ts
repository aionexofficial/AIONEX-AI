export type AdminSection = "overview" | "users" | "news" | "ai" | "landing" | "token" | "roadmap" | "faq" | "analytics" | "settings";

export type AdminRole = "admin";

export type AdminUser = { id: string; address: string; status: "Active" | "Suspended"; joined: string; activity: string };
export type ManagedContent = { id: string; title: string; category: string; status: "Published" | "Draft"; updated: string };
