import { watch as chokidarWatch } from "chokidar";
import { build } from "esbuild";
import { WebSocketServer } from "ws";
import {
  copyStyles,
  entryPoints,
  sharedBuildOptions,
  watchStyles,
} from "./build-shared.mjs";

// WebSocket server for auto-reload
const wss = new WebSocketServer({ port: 8090 });
const clients = new Set();
let pendingTabReload = false;

wss.on("connection", (ws) => {
  console.log("🔌 Extension connected to dev server");
  clients.add(ws);
  if (pendingTabReload) {
    ws.send(JSON.stringify({ type: "reload-tab" }));
    pendingTabReload = false;
  }
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
      successCount += 1;
    }
  }
  if (successCount > 0) {
    if (type === "reload") {
      pendingTabReload = true;
    }
    console.log(`🔄 Sent ${type} signal to ${successCount} client(s)`);
  }
}

const buildOptions = {
  ...sharedBuildOptions,
  define: {
    ...sharedBuildOptions.define,
    "process.env.NODE_ENV": '"development"',
  },
  entryPoints,
  outdir: "dist",
  sourcemap: "inline",
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
  ignoreInitial: true,
  persistent: true,
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
