import { watch as chokidarWatch } from "chokidar";
import { build } from "esbuild";
import { WebSocketServer } from "ws";
import { copyStyles, cssRawPlugin, watchStyles } from "./build-shared.mjs";

// WebSocket server for auto-reload
const wss = new WebSocketServer({ port: 8090 });
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("🔌 Extension connected to dev server");
  clients.add(ws);
  ws.on("close", () => {
    console.log("🔌 Extension disconnected from dev server");
    clients.delete(ws);
  });
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

function notifyClients(type) {
  let successCount = 0;
  for (const client of clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(JSON.stringify({ type }));
      successCount++;
    }
  }
  if (successCount > 0) {
    console.log(`🔄 Sent ${type} signal to ${successCount} client(s)`);
  }
}

const buildOptions = {
  entryPoints: ["src/background.ts", "src/content.ts", "src/popup.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  charset: "utf8",
  alias: {
    "@": "./src",
  },
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  loader: {
    ".toml": "text",
    ".css": "css",
  },
  outdir: "dist",
  sourcemap: "inline",
  plugins: [cssRawPlugin],
};

let isBuilding = false;
let buildQueued = false;

async function performBuild() {
  if (isBuilding) {
    buildQueued = true;
    return;
  }

  isBuilding = true;
  console.log("🔨 Building...");

  try {
    await build(buildOptions);
    console.log("✅ Build complete");
    notifyClients("reload");
  } catch (error) {
    console.error("❌ Build failed:", error);
  } finally {
    isBuilding = false;
    if (buildQueued) {
      buildQueued = false;
      setTimeout(() => performBuild(), 100);
    }
  }
}

// Initial build
await copyStyles();
await performBuild();

// Watch for file changes
watchStyles();

const watcher = chokidarWatch("src/**/*.{ts,tsx,toml}", {
  ignored: /(^|[/\\])\../,
  persistent: true,
  ignoreInitial: true,
});

watcher.on("change", (filePath) => {
  console.log(`📝 ${filePath} changed`);
  performBuild();
});

watcher.on("add", (filePath) => {
  console.log(`📝 ${filePath} added`);
  performBuild();
});

watcher.on("error", (error) => {
  console.error("❌ Watcher error:", error);
});

console.log("");
console.log("🚀 Dev server running");
console.log("📡 WebSocket server: ws://localhost:8090");
console.log("👀 Watching: src/**/*.{ts,tsx,toml,css}");
console.log("");
console.log("Press Ctrl+C to stop");
console.log("");
