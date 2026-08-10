import { expect, test } from "./setup";

test.describe("Popup UI", () => {
  test("should navigate between panes", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify initial pane is Actions (heading text is the fixed pane title
    // "Context Actions", not the "アクション" nav label; see
    // src/popup/panes/ActionsPane.tsx + src/i18n/resources.ts `actions.title`)
    await expect(page.locator("h2")).toHaveText("Context Actions");

    // Navigate to Settings
    await page.click('button[aria-label="設定"]');
    await expect(page.locator("h2")).toHaveText("設定");

    // Navigate to site-specific features
    await page.click('button[aria-label="サイト別機能"]');
    await expect(page.locator("h2")).toHaveText("サイト別機能");

    // Navigate to Create Link
    await page.click('button[aria-label="リンク作成"]');
    await expect(page.locator("h2")).toHaveText("リンク作成");

    // Navigate back to Actions
    await page.click('button[aria-label="アクション"]');
    await expect(page.locator("h2")).toHaveText("Context Actions");
  });

  test("should persist theme selection", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // The popup no longer exposes a single theme-cycle button (that concept
    // now lives only in the content-script overlay, see
    // src/components/ThemeCycleButton.tsx). Popup theme selection is a radio
    // group in the Settings pane (src/popup/panes/settings/SettingsThemeSection.tsx),
    // with labels sourced from src/i18n/resources.ts `theme.light` / `theme.dark`.
    await page.click('button[aria-label="設定"]');
    await expect(page.locator("h2")).toHaveText("設定");

    // Get initial theme
    const initialTheme = await page.locator("html").getAttribute("data-theme");

    // Switch to the theme option that differs from the current one
    const nextThemeLabel = initialTheme === "dark" ? "ライト" : "ダーク";
    await page.click(`label:has-text("${nextThemeLabel}")`);

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

    // Verify settings sections exist. The token fieldset legend is
    // "{{provider}} API トークン" (src/i18n/resources.ts `settings.apiToken`),
    // not English "OpenAI API Token"; Base UI's Fieldset renders it as a
    // group with an accessible name rather than a plain <legend>/<label>
    // element (src/components/shared/Fieldset.tsx). The model select's
    // Field has no htmlFor either, so it also surfaces only via the group's
    // accessible name (src/popup/panes/settings/SettingsModelSection.tsx).
    // Only "追加指示" (customPrompt) renders as a real <label>
    // (src/popup/panes/settings/SettingsPromptSection.tsx).
    await expect(
      page.getByRole("group", { name: "OpenAI API トークン" })
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "モデル" })).toBeVisible();
    await expect(page.locator('label:has-text("追加指示")')).toBeVisible();

    // Verify token input is password type
    const tokenInput = page.locator('input[type="password"]');
    await expect(tokenInput).toBeVisible();
  });

  // TODO(advisor/013): 「すべてのサイトで有効化」トグルは table-pane リファクタで
  // 廃止され、URL パターン + enableCurrentTab モデルへ移行済み。このテスト全体は
  // 新モデル向けに書き直しが必要（pattern-add セレクタの再検証を含む、要インタラクティブ検証）。
  test.skip("should manage table sort patterns", async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Navigate to site-specific features
    await page.click('button[aria-label="サイト別機能"]');
    await expect(page.locator("h2")).toHaveText("サイト別機能");

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
    await newPage.click('button[aria-label="サイト別機能"]');

    const checkbox = newPage.locator(
      'label:has-text("すべてのサイトで有効化") input[type="checkbox"]'
    );
    await expect(checkbox).toBeChecked();

    await newPage.close();
  });
});
