/**
 * Real-time Notification Client Adapter
 * Seamlessly connects to Next.js Server-Sent Events (SSE) while preserving
 * the SignalR-compatible interface for all frontend components & hooks.
 */

export interface ISignalRConnection {
  state: "Connected" | "Connecting" | "Disconnected";
  on(eventName: string, handler: (...args: any[]) => void): void;
  off(eventName: string, handler?: (...args: any[]) => void): void;
  stop(): Promise<void>;
}

class SseConnectionAdapter implements ISignalRConnection {
  public state: "Connected" | "Connecting" | "Disconnected" = "Disconnected";
  private eventSource: EventSource | null = null;
  private handlers = new Map<string, Set<(...args: any[]) => void>>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryDelayMs = 2000;
  private maxRetryDelayMs = 30000;
  private isExplicitlyClosed = false;

  public async start(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.state === "Connected" || this.state === "Connecting") return;

    this.isExplicitlyClosed = false;
    this.state = "Connecting";

    try {
      const token = await this.fetchAccessToken();
      const sseUrl = token
        ? `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`
        : `/api/v1/notifications/stream`;

      this.eventSource = new EventSource(sseUrl, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.state = "Connected";
        this.retryDelayMs = 2000; // Reset backoff
      };

      // Listen for custom event names matching SignalR
      const standardEvents = ["ReceiveNotification", "ReceiveRefreshHint", "connected"];
      for (const evtName of standardEvents) {
        this.attachEventListener(evtName);
      }

      this.eventSource.onerror = () => {
        this.state = "Disconnected";
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.state = "Disconnected";
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.start();
      }
    }, this.retryDelayMs);

    this.retryDelayMs = Math.min(this.retryDelayMs * 1.5, this.maxRetryDelayMs);
  }

  private attachEventListener(eventName: string): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener(eventName, (e: MessageEvent) => {
      let data: any = e.data;
      try {
        data = JSON.parse(e.data);
      } catch {
        // use raw data
      }

      const callbacks = this.handlers.get(eventName);
      if (callbacks) {
        for (const cb of callbacks) {
          try {
            cb(data);
          } catch (err) {
            console.error(`Error in notification handler for ${eventName}:`, err);
          }
        }
      }
    });
  }

  public on(eventName: string, handler: (...args: any[]) => void): void {
    let set = this.handlers.get(eventName);
    if (!set) {
      set = new Set();
      this.handlers.set(eventName, set);
      this.attachEventListener(eventName);
    }
    set.add(handler);
  }

  public off(eventName: string, handler?: (...args: any[]) => void): void {
    if (!handler) {
      this.handlers.delete(eventName);
      return;
    }
    const set = this.handlers.get(eventName);
    if (set) {
      set.delete(handler);
    }
  }

  public async stop(): Promise<void> {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.state = "Disconnected";
  }

  private async fetchAccessToken(): Promise<string> {
    try {
      const fallback =
        typeof window !== "undefined"
          ? localStorage.getItem("pw_fallback_refresh")
          : null;
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ refreshToken: fallback }),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as {
        accessToken: string | null;
        refreshToken?: string | null;
      };
      if (data?.refreshToken && typeof window !== "undefined") {
        try {
          localStorage.setItem("pw_fallback_refresh", data.refreshToken);
        } catch {}
      }
      return data.accessToken ?? "";
    } catch {
      return "";
    }
  }
}

let connectionInstance: SseConnectionAdapter | null = null;
let startingPromise: Promise<ISignalRConnection | null> | null = null;

export function getSignalRConnection(): ISignalRConnection | null {
  return connectionInstance;
}

export async function startSignalRConnection(): Promise<ISignalRConnection | null> {
  if (typeof window === "undefined") return null;

  if (connectionInstance && connectionInstance.state === "Connected") {
    return connectionInstance;
  }

  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = (async () => {
    try {
      if (!connectionInstance) {
        connectionInstance = new SseConnectionAdapter();
      }
      await connectionInstance.start();
      return connectionInstance;
    } finally {
      startingPromise = null;
    }
  })();

  return startingPromise;
}

export async function stopSignalRConnection(): Promise<void> {
  if (connectionInstance) {
    await connectionInstance.stop();
    connectionInstance = null;
  }
}
