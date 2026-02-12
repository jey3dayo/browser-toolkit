/**
 * Development-only auto-reload client
 * Connects to the dev server's WebSocket and reloads the extension on file changes
 */

export {};

const DEV_SERVER_URL = "ws://localhost:8090";
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function connect() {
  if (ws?.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    ws = new WebSocket(DEV_SERVER_URL);

    ws.onopen = () => {
      console.log("[dev-reload] 🔌 Connected to dev server");
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "reload") {
          console.log("[dev-reload] 🔄 Reloading extension...");
          chrome.runtime.reload();
        }
      } catch (error) {
        console.error("[dev-reload] Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[dev-reload] ⚠️ WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("[dev-reload] 🔌 Disconnected from dev server");
      scheduleReconnect();
    };
  } catch (error) {
    console.error("[dev-reload] ⚠️ Failed to connect:", error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  reconnectAttempts++;

  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.log(
      "[dev-reload] ⚠️ Max reconnect attempts reached. Auto-reload disabled."
    );
    return;
  }

  reconnectTimeout = setTimeout(() => {
    console.log(
      `[dev-reload] 🔄 Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
    connect();
  }, RECONNECT_INTERVAL);
}

// Initial connection
console.log("[dev-reload] 🚀 Auto-reload enabled");
connect();
