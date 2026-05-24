import type { TableId, Topic } from "../types";

const DEFAULT_PROD_API_URL = "https://g.ismayday.mobi/tavern-api";
const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_TAVERN_API_URL || (import.meta.env.DEV ? "" : DEFAULT_PROD_API_URL)
);

export type ChatRequest = {
  npcId: string;
  npcName: string;
  message: string;
  topic?: Topic;
  tableId: TableId;
  tablemates: Array<{ id: string; name: string; title: string }>;
  eventId?: string;
  eventName?: string;
  eventDescription?: string;
  recentMessages?: Array<{ role: "player" | "npc"; text: string }>;
  clientTime: string;
};

export type ChatHandlers = {
  signal?: AbortSignal;
  onMeta?: (payload: unknown) => void;
  onDelta?: (delta: string, fullText: string) => void;
  onDone?: (reply: string, source: string) => void;
  onError?: (error: Error) => void;
};

export async function streamNpcChat(payload: ChatRequest, handlers: ChatHandlers): Promise<void> {
  try {
    const response = await fetch(buildApiUrl("/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: handlers.signal
    });
    if (!response.ok || !response.body) throw new Error(`聊天接口异常：${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const eventText of events) handleSseEvent(eventText, handlers);
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    handlers.onError?.(error as Error);
  }
}

function handleSseEvent(eventText: string, handlers: ChatHandlers): void {
  const event = eventText.match(/^event:\s*(.+)$/m)?.[1]?.trim();
  const data = eventText.match(/^data:\s*(.+)$/m)?.[1];
  if (!event || !data) return;
  const payload = JSON.parse(data);
  if (event === "meta") handlers.onMeta?.(payload);
  if (event === "delta") handlers.onDelta?.(payload.delta || "", payload.fullText || "");
  if (event === "done") handlers.onDone?.(payload.reply || "", payload.source || "unknown");
}

function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function buildApiUrl(path: string): string {
  if (!API_BASE_URL) return `/api${path}`;
  return `${API_BASE_URL}${path}`;
}
