import * as signalR from "@microsoft/signalr";

const HUB_URL =
  process.env.NEXT_PUBLIC_SIGNALR_HUB_URL ?? "http://localhost:5268/hubs/notifications";

let connection: signalR.HubConnection | null = null;
let startingPromise: Promise<signalR.HubConnection | null> | null = null;

async function fetchAccessToken(): Promise<string> {
  try {
    const res = await fetch("/api/auth/token", { cache: "no-store" });
    if (!res.ok) return "";
    const data = (await res.json()) as { accessToken: string | null };
    return data.accessToken ?? "";
  } catch {
    return "";
  }
}

export function getSignalRConnection(): signalR.HubConnection | null {
  return connection;
}

export async function startSignalRConnection(): Promise<signalR.HubConnection | null> {
  if (typeof window === "undefined") return null;

  if (connection && connection.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  if (startingPromise) {
    return startingPromise;
  }

  startingPromise = (async () => {
    try {
      if (!connection) {
        connection = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL, {
            accessTokenFactory: fetchAccessToken,
            skipNegotiation: false,
            transport:
              signalR.HttpTransportType.WebSockets |
              signalR.HttpTransportType.ServerSentEvents |
              signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(
            process.env.NODE_ENV === "development"
              ? signalR.LogLevel.Information
              : signalR.LogLevel.Warning,
          )
          .build();
      }

      if (connection.state === signalR.HubConnectionState.Disconnected) {
        await connection.start();
      }

      return connection;
    } catch (err) {
      console.warn("SignalR connection start error:", err);
      return null;
    } finally {
      startingPromise = null;
    }
  })();

  return startingPromise;
}

export async function stopSignalRConnection(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch (err) {
      console.warn("SignalR stop error:", err);
    }
    connection = null;
  }
}
