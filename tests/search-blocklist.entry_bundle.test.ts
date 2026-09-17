import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(dirname, "..");

describe("search-blocklist entry bundle", () => {
  it("does not pull in React, Base UI, or shared UI components", async () => {
    const result = await build({
      alias: { "@": path.join(repoRoot, "src") },
      bundle: true,
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      entryPoints: [path.join(repoRoot, "src/search-blocklist.ts")],
      format: "iife",
      loader: { ".css": "empty", ".toml": "text" },
      metafile: true,
      platform: "browser",
      target: "es2020",
      write: false,
    });

    const inputPaths = Object.keys(result.metafile?.inputs ?? {}).map(
      (inputPath) => inputPath.replace(/\\/g, "/")
    );

    const forbidden = inputPaths.filter(
      (inputPath) =>
        inputPath.includes("node_modules/react") ||
        inputPath.includes("node_modules/react-dom") ||
        inputPath.includes("node_modules/@base-ui") ||
        inputPath.includes("src/components/") ||
        inputPath.includes("src/ui/")
    );

    expect(forbidden).toEqual([]);
  });
});
