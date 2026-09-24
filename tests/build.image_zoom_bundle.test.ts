import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { cssRawPlugin } from "../scripts/build-shared.mjs";

describe("image-zoom bundle", () => {
  it("excludes i18next from the X-only content script", async () => {
    const projectRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );

    const result = await build({
      alias: { "@": path.join(projectRoot, "src") },
      bundle: true,
      entryPoints: [path.join(projectRoot, "src/image-zoom.ts")],
      format: "iife",
      loader: { ".css": "css", ".toml": "text" },
      metafile: true,
      platform: "browser",
      plugins: [cssRawPlugin],
      target: "es2020",
      write: false,
    });

    const inputPaths = Object.keys(result.metafile?.inputs ?? {});
    expect(inputPaths.some((input) => input.includes("i18next"))).toBe(false);

    const output = result.outputFiles?.[0]?.text ?? "";
    expect(output).not.toContain("i18next");
  });
});
