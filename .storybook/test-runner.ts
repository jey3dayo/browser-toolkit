import type { TestRunnerConfig } from "@storybook/test-runner";
import { toMatchImageSnapshot } from "jest-image-snapshot";

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // Skip visual regression for certain stories if needed
    // Can be controlled via story parameters in the future

    // Light mode snapshot
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(300); // Wait for theme to apply

    const lightImage = await page.screenshot({ fullPage: true });
    expect(lightImage).toMatchImageSnapshot({
      customSnapshotIdentifier: `${context.id}-light`,
      customSnapshotsDir: "__snapshots__",
      failureThreshold: 0.01, // 1% difference tolerance
      failureThresholdType: "percent",
    });

    // Dark mode snapshot
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(300); // Wait for theme to apply

    const darkImage = await page.screenshot({ fullPage: true });
    expect(darkImage).toMatchImageSnapshot({
      customSnapshotIdentifier: `${context.id}-dark`,
      customSnapshotsDir: "__snapshots__",
      failureThreshold: 0.01, // 1% difference tolerance
      failureThresholdType: "percent",
    });
  },
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
};

export default config;
