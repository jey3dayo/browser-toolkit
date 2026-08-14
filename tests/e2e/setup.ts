import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

// 拡張機能ルート = manifest.json があるリポジトリ直下。
// Playwright は e2e ファイルを CJS へ変換するため、ESM 専用のパス解決 API は使えない。
const extensionRoot = path.resolve(import.meta.dirname, "../../");

function resolveExtensionRoot(): string {
  const manifestPath = path.join(extensionRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Extension root does not contain manifest.json: ${extensionRoot}`
    );
  }
  return extensionRoot;
}

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern
  context: async ({}, use) => {
    const pathToExtension = resolveExtensionRoot();
    const context = await chromium.launchPersistentContext("", {
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
      headless: false,
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }

    const [, , extensionId] = background.url().split("/");
    await use(extensionId);
  },
});

export const { expect } = test;
