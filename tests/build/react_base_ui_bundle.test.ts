import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { isRecord } from "@/utils/guards";

const scriptsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "scripts"
);

async function readBundleScript(): Promise<string> {
  const pkg: unknown = JSON.parse(
    await fs.readFile(new URL("../../package.json", import.meta.url), "utf-8")
  );
  if (!(isRecord(pkg) && isRecord(pkg.scripts))) {
    return "";
  }
  const { bundle } = pkg.scripts;
  return typeof bundle === "string" ? bundle : "";
}

describe("React/Base UI bundling", () => {
  it("build-shared.mjs defines process.env.NODE_ENV in sharedBuildOptions", async () => {
    const bundleScript = await readBundleScript();
    if (!bundleScript.includes("scripts/bundle.mjs")) {
      expect(bundleScript).toContain("--define:process.env.NODE_ENV=");
      return;
    }

    const { sharedBuildOptions } = await import(
      "../../scripts/build-shared.mjs"
    );
    expect(sharedBuildOptions.define?.["process.env.NODE_ENV"]).toBe(
      '"production"'
    );
  });

  it("bundle.mjs spreads sharedBuildOptions instead of redefining build options", async () => {
    const bundleScript = await readBundleScript();
    if (!bundleScript.includes("scripts/bundle.mjs")) {
      return;
    }

    const bundleContents = await fs.readFile(
      path.join(scriptsDir, "bundle.mjs"),
      "utf-8"
    );
    expect(bundleContents).toContain("...sharedBuildOptions");
  });

  it("bundles React, ReactDOM, Base UI, and shadcn MessageScroller for MV3 targets", async () => {
    const result = await build({
      bundle: true,
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      format: "iife",
      outfile: "out.js",
      platform: "browser",
      stdin: {
        contents: [
          "import * as React from 'react';",
          "import { createRoot } from 'react-dom/client';",
          "import { Tabs } from '@base-ui/react';",
          "import { MessageScroller } from '@shadcn/react/message-scroller';",
          "",
          "const el = React.createElement('div', null, 'ok');",
          "void el;",
          "void Tabs;",
          "void MessageScroller;",
          'void createRoot(document.createElement("div"));',
        ].join("\n"),
        resolveDir: process.cwd(),
        sourcefile: "ui-entry.ts",
      },
      target: "es2020",
      write: false,
    });

    const output = result.outputFiles?.[0]?.text ?? "";
    expect(output).not.toContain("process.env.NODE_ENV");
  });
});
