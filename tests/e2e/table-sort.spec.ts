import fs from "node:fs";
import path from "node:path";
import { FIXTURES_BASE_URL } from "../../playwright.config";
import { expect, test } from "./setup";

const PRODUCT_NAME_REGEX = /商品[ABC]/;

// Served by tests/e2e/fixtures/serve.mjs (see playwright.config.ts webServer)
// so the extension's content script can inject; file:// URLs cannot be
// enabled for extension access via CLI launch flags alone. setup.ts's
// `context` fixture bypasses Playwright's default baseURL wiring, so build
// the absolute URL explicitly rather than relying on relative page.goto().
const TEST_PAGE_URL = `${FIXTURES_BASE_URL}/test-table.html`;

const testTableFixturePath = path.resolve(
  __dirname,
  "fixtures/test-table.html"
);

if (!fs.existsSync(testTableFixturePath)) {
  throw new Error(`Missing e2e fixture page: ${testTableFixturePath}`);
}

test.describe("Table Sort Feature", () => {
  test("should enable sorting on basic table", async ({
    page,
    extensionId,
  }) => {
    await page.goto(TEST_PAGE_URL);

    const popupPage = await page.context().newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    await popupPage.click('button[aria-label="サイト別機能"]');
    await popupPage.waitForSelector("text=サイト別機能");

    // "このタブで有効化" resolves the target tab via
    // chrome.tabs.query({ active: true, currentWindow: true }). Opening the
    // popup as a regular tab (via context.newPage()) — unlike a real
    // toolbar-icon popup, which never becomes the active tab — makes the
    // popup itself the active tab, so it must be brought back into the
    // background before triggering enableNow().
    await page.bringToFront();

    await popupPage.click("text=このタブで有効化");

    await popupPage.close();

    await page.waitForSelector('table[data-sortable="true"]', {
      timeout: 5000,
    });

    const isSortable = await page
      .locator("#basic-table")
      .getAttribute("data-sortable");
    expect(isSortable).toBe("true");

    await page.click("th:first-child");

    const firstCell = await page
      .locator("tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCell).toBe("Alice");

    await page.click("th:first-child");

    const firstCellReversed = await page
      .locator("tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCellReversed).toBe("David");
  });

  // TODO(advisor/013): 「すべてのサイトで有効化」トグルは table-pane リファクタで
  // 廃止され、URL パターン + enableCurrentTab モデルへ移行済み。このテストは
  // 新モデル向けに書き直しが必要（要インタラクティブ検証）。
  test.skip("should handle dynamic table insertion", async ({
    page,
    extensionId,
  }) => {
    await page.goto(TEST_PAGE_URL);

    const popupPage = await page.context().newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.click('button[aria-label="サイト別機能"]');
    await popupPage.waitForSelector("text=サイト別機能");

    const globalToggle = popupPage.locator(
      'label:has-text("すべてのサイトで有効化")'
    );
    const checkbox = globalToggle.locator('input[type="checkbox"]');
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await globalToggle.click();
    }

    await popupPage.close();

    await page.click("#add-table-btn");

    await page.waitForSelector('#dynamic-table[data-sortable="true"]', {
      timeout: 3000,
    });

    const isDynamicSortable = await page
      .locator("#dynamic-table")
      .getAttribute("data-sortable");
    expect(isDynamicSortable).toBe("true");

    await page.click("#dynamic-table th:first-child");

    const firstCell = await page
      .locator("#dynamic-table tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCell).toMatch(PRODUCT_NAME_REGEX);
  });
});
