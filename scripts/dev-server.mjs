import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { watch as chokidarWatch } from "chokidar";
import { build } from "esbuild";
import { WebSocketServer } from "ws";

const RAW_QUERY_REGEX = /\?raw$/;
const ANY_FILE_REGEX = /.*/;

const projectRoot = process.cwd();
const stylesSrc = path.join(projectRoot, "src/styles");
const stylesDest = path.join(projectRoot, "dist/styles");

const cssRawPlugin = {
  name: "css-raw",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: RAW_QUERY_REGEX }, async (args) => {
      const withoutQuery = args.path.replace(RAW_QUERY_REGEX, "");
      const resolved = await pluginBuild.resolve(withoutQuery, {
        resolveDir: args.resolveDir,
        kind: args.kind,
      });
      if (resolved.errors.length > 0) {
        return { errors: resolved.errors };
      }
      return {
        path: resolved.path,
        namespace: "css-raw",
      };
    });

    pluginBuild.onLoad(
      { filter: ANY_FILE_REGEX, namespace: "css-raw" },
      async (args) => {
        const contents = await fsp.readFile(args.path, "utf8");
        return { contents, loader: "text" };
      }
    );
  },
};

async function copyStyles() {
  await fsp.mkdir(stylesDest, { recursive: true });
  await fsp.cp(stylesSrc, stylesDest, { recursive: true });
}

function watchStyles() {
  let timeout;
  const scheduleCopy = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      copyStyles().catch((error) => {
        console.error("[styles] copy failed", error);
      });
    }, 50);
  };

  const watcher = fs.watch(stylesSrc, { recursive: true }, (_, filename) => {
    if (typeof filename === "string" && !filename.endsWith(".css")) {
      return;
    }
    scheduleCopy();
  });

  watcher.on("error", (error) => {
    console.error("[styles] watch failed", error);
  });
}

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
