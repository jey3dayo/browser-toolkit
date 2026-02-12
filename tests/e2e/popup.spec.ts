import { expect, test } from "./setup";

test.describe("Popup UI", () => {
  test("should navigate between panes", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify initial pane is Actions
    await expect(page.locator("h2")).toHaveText("アクション");

    // Navigate to Settings
    await page.click('button[aria-label="設定"]');
    await expect(page.locator("h2")).toHaveText("設定");

    // Navigate to Table Sort
    await page.click('button[aria-label="テーブルソート"]');
    await expect(page.locator("h2")).toHaveText("テーブルソート");

    // Navigate to Create Link
    await page.click('button[aria-label="リンク作成"]');
    await expect(page.locator("h2")).toHaveText("リンク作成");

    // Navigate back to Actions
    await page.click('button[aria-label="アクション"]');
    await expect(page.locator("h2")).toHaveText("アクション");
  });

  test("should persist theme selection", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Get initial theme
    const initialTheme = await page.locator("html").getAttribute("data-theme");

    // Click theme cycle button
    await page.click('[data-testid="theme-cycle-button"]');

    // Wait for theme to change
    await page.waitForTimeout(300);

    // Get new theme
    const newTheme = await page.locator("html").getAttribute("data-theme");

    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);

    // Close and reopen popup
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify theme persisted
    const persistedTheme = await newPage
      .locator("html")
      .getAttribute("data-theme");
    expect(persistedTheme).toBe(newTheme);

    await newPage.close();
  });

  test("should display settings correctly", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Navigate to Settings
    await page.click('button[aria-label="設定"]');
    await expect(page.locator("h2")).toHaveText("設定");

    // Verify settings sections exist
    await expect(
      page.locator('label:has-text("OpenAI API Token")')
    ).toBeVisible();
    await expect(page.locator('label:has-text("モデルID")')).toBeVisible();
    await expect(page.locator('label:has-text("追加指示")')).toBeVisible();

    // Verify token input is password type
    const tokenInput = page.locator('input[type="password"]');
    await expect(tokenInput).toBeVisible();
  });

  test("should manage table sort patterns", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Navigate to Table Sort
    await page.click('button[aria-label="テーブルソート"]');
    await expect(page.locator("h2")).toHaveText("テーブルソート");

    // Add a new pattern
    const patternInput = page.locator('input[placeholder*="ドメイン"]');
    await patternInput.fill("example.com/test*");

    await page.click('button:has-text("追加")');

    // Verify pattern was added
    await expect(page.locator("text=example.com/test*")).toBeVisible();

    // Test global toggle
    const globalToggle = page.locator(
      'label:has-text("すべてのサイトで有効化")'
    );
    await globalToggle.click();

    // Wait for storage update
    await page.waitForTimeout(300);

    // Verify toggle state persists
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await newPage.click('button[aria-label="テーブルソート"]');

    const checkbox = newPage.locator(
      'label:has-text("すべてのサイトで有効化") input[type="checkbox"]'
    );
    await expect(checkbox).toBeChecked();

    await newPage.close();
  });
});
