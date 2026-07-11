import { ChatInterface } from "@/components/assistant/chat-interface";
import { AppShell } from "../components/app-shell";

export default function AssistantPage() {
  return (
    <AppShell eyebrow="AIONEX COPILOT" title="Intelligence, on demand.">
      <ChatInterface />
    </AppShell>
  );
}
