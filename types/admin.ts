export type AdminSection = "overview" | "users" | "ai" | "news" | "market" | "token" | "analytics";

export type AdminUser = { id: string; address: string; status: "Active" | "Suspended"; joined: string; activity: string };
export type ManagedContent = { id: string; title: string; category: string; status: "Published" | "Draft"; updated: string };
