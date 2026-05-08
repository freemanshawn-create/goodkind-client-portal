import { mockThreads, mockMessages } from "@/data/mock/messages";
import {
  getAsanaThreads,
  getAsanaThreadById,
  getAsanaMessagesByThread,
  getAsanaTotalUnreadCount,
} from "@/data/repositories/asana-messages";
import type { MessageThread, Message } from "@/data/types";

function useAsana() {
  return !!process.env.ASANA_PAT;
}

export async function getThreads(): Promise<MessageThread[]> {
  if (useAsana()) {
    // TODO: when messages tab is brought back, store Asana GID on the
    // Clerk user publicMetadata and pass it here for per-user filtering.
    return getAsanaThreads(null);
  }
  return [...mockThreads].sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );
}

export async function getThreadById(
  id: string
): Promise<MessageThread | null> {
  if (useAsana()) {
    return getAsanaThreadById(id);
  }
  return mockThreads.find((t) => t.id === id) ?? null;
}

export async function getMessagesByThread(
  threadId: string
): Promise<Message[]> {
  if (useAsana()) {
    return getAsanaMessagesByThread(threadId);
  }
  return mockMessages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getTotalUnreadCount(): Promise<number> {
  if (useAsana()) {
    return getAsanaTotalUnreadCount();
  }
  return mockThreads.reduce((sum, t) => sum + t.unreadCount, 0);
}
