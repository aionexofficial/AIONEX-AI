export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error";
};

export type ChatRequest = {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  conversationId?: string;
};

export type AssistantProvider = {
  stream(messages: ChatRequest["messages"], signal: AbortSignal): AsyncGenerator<string>;
};
