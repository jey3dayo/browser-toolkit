import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const RAW_QUERY_REGEX = /\?raw$/;
const ANY_FILE_REGEX = /.*/;

const projectRoot = process.cwd();
const stylesSrc = path.join(projectRoot, "src/styles");
const stylesDest = path.join(projectRoot, "dist/styles");

export const cssRawPlugin = {
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

export async function copyStyles() {
  await fsp.mkdir(stylesDest, { recursive: true });
  await fsp.cp(stylesSrc, stylesDest, { recursive: true });
}

export function watchStyles() {
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
