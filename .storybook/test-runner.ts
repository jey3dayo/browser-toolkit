import type { TestRunnerConfig } from "@storybook/test-runner";
import { toMatchImageSnapshot } from "jest-image-snapshot";

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async postVisit(page, context) {
    // Skip visual regression for certain stories if needed
    // Can be controlled via story parameters in the future

    // Light mode snapshot
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(300); // Wait for theme to apply

    const lightImage = await page.screenshot({ fullPage: true });
    // biome-ignore lint/suspicious/noMisplacedAssertion: Storybook test-runner context
    expect(lightImage).toMatchImageSnapshot({
      customSnapshotsDir: "__snapshots__",
      customSnapshotIdentifier: `${context.id}-light`,
      failureThreshold: 0.01, // 1% difference tolerance
      failureThresholdType: "percent",
    });

    // Dark mode snapshot
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(300); // Wait for theme to apply

    const darkImage = await page.screenshot({ fullPage: true });
    // biome-ignore lint/suspicious/noMisplacedAssertion: Storybook test-runner context
    expect(darkImage).toMatchImageSnapshot({
      customSnapshotsDir: "__snapshots__",
      customSnapshotIdentifier: `${context.id}-dark`,
      failureThreshold: 0.01, // 1% difference tolerance
      failureThresholdType: "percent",
    });
  },
};

export default config;
