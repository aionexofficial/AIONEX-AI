import "server-only";

import { neon } from "@neondatabase/serverless";

function db() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured."); return neon(process.env.DATABASE_URL); }

export async function openConversation(userId: string, conversationId: string | null, firstMessage: string) {
  if (conversationId) {
    const owned = await db()`SELECT id FROM aion_ai_conversations WHERE id=${conversationId}::uuid AND user_id=${userId}::uuid LIMIT 1`;
    if (!owned[0]) throw new Error("Conversation not found.");
    return String(owned[0].id);
  }
  const rows = await db()`INSERT INTO aion_ai_conversations(user_id,title) VALUES(${userId}::uuid,${firstMessage.slice(0, 72)}) RETURNING id`;
  return String(rows[0].id);
}

export async function saveConversationMessage(conversationId: string, role: "user" | "assistant", content: string) {
  await db()`INSERT INTO aion_ai_messages(conversation_id,role,content) VALUES(${conversationId}::uuid,${role},${content.slice(0, 20_000)})`;
  await db()`UPDATE aion_ai_conversations SET updated_at=NOW() WHERE id=${conversationId}::uuid`;
}

export async function recentConversation(userId: string) {
  const conversations = await db()`SELECT id,title,updated_at FROM aion_ai_conversations WHERE user_id=${userId}::uuid ORDER BY updated_at DESC LIMIT 1`;
  if (!conversations[0]) return null;
  const id = String(conversations[0].id);
  const messages = await db()`SELECT id,role,content,created_at FROM aion_ai_messages WHERE conversation_id=${id}::uuid ORDER BY created_at DESC LIMIT 30`;
  return { id, title: String(conversations[0].title), updatedAt: new Date(String(conversations[0].updated_at)).toISOString(), messages: messages.reverse().map(row => ({ id: String(row.id), role: String(row.role) as "user" | "assistant", content: String(row.content), createdAt: new Date(String(row.created_at)).toISOString() })) };
}
