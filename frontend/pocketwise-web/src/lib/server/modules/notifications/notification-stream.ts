import type {
  NotificationResponse,
  RefreshHintPayload,
} from "@/types/notification.types";

type StreamController = ReadableStreamDefaultController<Uint8Array>;

class NotificationStreamManager {
  private userStreams = new Map<number, Set<StreamController>>();
  private encoder = new TextEncoder();

  /**
   * Register active SSE client stream
   */
  public addClient(userId: number, controller: StreamController): void {
    let set = this.userStreams.get(userId);
    if (!set) {
      set = new Set();
      this.userStreams.set(userId, set);
    }
    set.add(controller);
  }

  /**
   * Remove SSE client stream on disconnect
   */
  public removeClient(userId: number, controller: StreamController): void {
    const set = this.userStreams.get(userId);
    if (set) {
      set.delete(controller);
      if (set.size === 0) {
        this.userStreams.delete(userId);
      }
    }
  }

  /**
   * Send SSE message to user
   */
  public sendToUser(userId: number, event: string, data: unknown): void {
    const set = this.userStreams.get(userId);
    if (!set || set.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = this.encoder.encode(payload);

    for (const controller of set) {
      try {
        controller.enqueue(encoded);
      } catch (err) {
        // Controller might already be closed
        set.delete(controller);
      }
    }
  }

  /**
   * Broadcast notification payload
   */
  public sendNotification(userId: number, notification: NotificationResponse): void {
    this.sendToUser(userId, "ReceiveNotification", notification);
  }

  /**
   * Broadcast entity refresh hint
   */
  public sendRefreshHint(userId: number, hint: RefreshHintPayload): void {
    this.sendToUser(userId, "ReceiveRefreshHint", hint);
  }

  /**
   * Send keep-alive heartbeat comment
   */
  public sendHeartbeat(controller: StreamController): boolean {
    try {
      controller.enqueue(this.encoder.encode(": keep-alive\n\n"));
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationStreamManager = new NotificationStreamManager();
