import path from "node:path";
import { expect, test } from "./setup";

const PRODUCT_NAME_REGEX = /商品[ABC]/;

test.describe("Table Sort Feature", () => {
  test("should enable sorting on basic table", async ({
    page,
    extensionId,
  }) => {
    // Load test page
    const testPagePath = `file://${path.join(import.meta.dirname, "fixtures/test-table.html")}`;
    await page.goto(testPagePath);

    // Open popup and enable table sort for all sites
    const popupPage = await page.context().newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Navigate to Table Sort pane
    await popupPage.click('button[aria-label="テーブルソート"]');
    await popupPage.waitForSelector("text=テーブルソート");

    // Enable for current tab
    await popupPage.click("text=このタブで有効化");

    // Close popup
    await popupPage.close();

    // Wait for content script to apply sortable attribute
    await page.waitForSelector('table[data-sortable="true"]', {
      timeout: 5000,
    });

    // Verify sortable attribute is applied
    const isSortable = await page
      .locator("#basic-table")
      .getAttribute("data-sortable");
    expect(isSortable).toBe("true");

    // Click the first header (名前) to sort
    await page.click("th:first-child");

    // Verify sorting: first row should be "Alice" (alphabetically first)
    const firstCell = await page
      .locator("tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCell).toBe("Alice");

    // Click again to reverse sort
    await page.click("th:first-child");

    // Verify reverse sorting: first row should be "David" (alphabetically last)
    const firstCellReversed = await page
      .locator("tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCellReversed).toBe("David");
  });

  test("should handle dynamic table insertion", async ({
    page,
    extensionId,
  }) => {
    const testPagePath = `file://${path.join(import.meta.dirname, "fixtures/test-table.html")}`;
    await page.goto(testPagePath);

    // Enable table sort globally
    const popupPage = await page.context().newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.click('button[aria-label="テーブルソート"]');
    await popupPage.waitForSelector("text=テーブルソート");

    // Enable global flag
    const globalToggle = popupPage.locator(
      'label:has-text("すべてのサイトで有効化")'
    );
    const checkbox = globalToggle.locator('input[type="checkbox"]');
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await globalToggle.click();
    }

    await popupPage.close();

    // Add dynamic table
    await page.click("#add-table-btn");

    // Wait for MutationObserver to detect and make table sortable
    await page.waitForSelector('#dynamic-table[data-sortable="true"]', {
      timeout: 3000,
    });

    // Verify dynamic table is sortable
    const isDynamicSortable = await page
      .locator("#dynamic-table")
      .getAttribute("data-sortable");
    expect(isDynamicSortable).toBe("true");

    // Click header to verify sorting works
    await page.click("#dynamic-table th:first-child");

    // Verify sorting applied
    const firstCell = await page
      .locator("#dynamic-table tbody tr:first-child td:first-child")
      .textContent();
    expect(firstCell).toMatch(PRODUCT_NAME_REGEX);
  });
});
