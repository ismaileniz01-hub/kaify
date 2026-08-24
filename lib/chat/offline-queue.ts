export type QueuedChat = {
  coachId: string;
  text: string;
  queuedAt: number;
};

const QUEUE_KEY = "kaify-chat-offline-queue";

function readQueue(): QueuedChat[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedChat[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.text) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedChat[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    // quota / private mode
  }
}

export function enqueueOfflineChat(coachId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  writeQueue([
    ...readQueue(),
    { coachId, text: trimmed, queuedAt: Date.now() },
  ]);
}

export function peekOfflineChats(coachId: string): QueuedChat[] {
  return readQueue().filter((item) => item.coachId === coachId);
}

export function dequeueOfflineChats(coachId: string): QueuedChat[] {
  const all = readQueue();
  const mine = all.filter((item) => item.coachId === coachId);
  writeQueue(all.filter((item) => item.coachId !== coachId));
  return mine;
}

export function offlineQueueCount(coachId?: string): number {
  const all = readQueue();
  return coachId ? all.filter((item) => item.coachId === coachId).length : all.length;
}
