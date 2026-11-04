import type {
  CreateTransactionRequest,
  TransactionResponse,
} from "@/types/transaction.types";
import { apiClient } from "./api-client";

export interface QueuedOfflineTransaction {
  id: string;
  payload: CreateTransactionRequest;
  createdAt: string;
}

const STORAGE_KEY = "pocketwise_offline_transactions";

export function getOfflineQueue(): QueuedOfflineTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addOfflineQueue(
  payload: CreateTransactionRequest
): QueuedOfflineTransaction {
  const item: QueuedOfflineTransaction = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    payload,
    createdAt: new Date().toISOString(),
  };

  try {
    const current = getOfflineQueue();
    current.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent("pocketwise:offline-queue-changed", {
        detail: { count: current.length },
      })
    );
  } catch {}

  return item;
}

export function removeOfflineQueue(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineQueue().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(
      new CustomEvent("pocketwise:offline-queue-changed", {
        detail: { count: current.length },
      })
    );
  } catch {}
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("pocketwise:offline-queue-changed", {
        detail: { count: 0 },
      })
    );
  } catch {}
}

export async function syncOfflineQueue(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { total: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await apiClient.post<TransactionResponse>(
        "/api/v1/transactions",
        item.payload
      );
      removeOfflineQueue(item.id);
      succeeded++;
    } catch {
      failed++;
    }
  }

  window.dispatchEvent(
    new CustomEvent("pocketwise:offline-synced", {
      detail: { total: queue.length, succeeded, failed },
    })
  );

  return { total: queue.length, succeeded, failed };
}
