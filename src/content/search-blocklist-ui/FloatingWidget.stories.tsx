import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  FloatingWidgetStory,
  makeStoryEntry,
} from "./SearchBlocklistUi.story-helpers";

const WIDGET_HOST_ID = "browser-toolkit-search-blocklist-widget-story";

function getWidgetShadow(canvasElement: HTMLElement): ShadowRoot {
  const host = canvasElement.querySelector<HTMLDivElement>(
    `#${WIDGET_HOST_ID}`
  );
  const shadow = host?.shadowRoot ?? null;
  if (!shadow) {
    throw new Error("search blocklist widget shadow root not found");
  }
  return shadow;
}

const meta = {
  component: FloatingWidgetStory,
  tags: ["test"],
  title: "Content/SearchBlocklist/FloatingWidget",
} satisfies Meta<typeof FloatingWidgetStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HoverShowsBlockButton: Story = {
  args: {
    entries: [makeStoryEntry()],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await userEvent.hover(result);

    await waitFor(() => {
      const trigger = getWidgetShadow(canvasElement).querySelector(
        '[aria-label="この検索結果をブロック"]'
      );
      expect(trigger).toBeTruthy();
    });
  },
};

export const OpensBlockDialog: Story = {
  args: {
    entries: [makeStoryEntry()],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await userEvent.hover(result);

    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="この検索結果をブロック"]'
        )
      ).toBeTruthy();
    });
    const trigger = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="この検索結果をブロック"]'
    ) as HTMLButtonElement;
    await userEvent.click(trigger);

    await waitFor(() => {
      const shadow = getWidgetShadow(canvasElement);
      expect(shadow.textContent).toContain("このサイトをブロック");
      expect(shadow.textContent).toContain("spammy-example.com");
    });

    const popup = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="このサイトをブロック"]'
    ) as HTMLElement | null;
    const rect = popup?.getBoundingClientRect();
    expect(rect?.width).toBeGreaterThan(0);
    expect(rect?.top ?? -1).toBeGreaterThanOrEqual(0);
    expect(rect?.top ?? Number.POSITIVE_INFINITY).toBeLessThan(
      window.innerHeight
    );
  },
};

export const UnblockShowsMatchedRules: Story = {
  args: {
    entries: [
      makeStoryEntry({
        blocked: true,
        matchedPatterns: ["*://*.spammy-example.com/*"],
        matchedRuleIds: ["sbl-spammy-example-com-1"],
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await userEvent.hover(result);
    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="この検索結果をブロック"]'
        )
      ).toBeTruthy();
    });
    const trigger = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="この検索結果をブロック"]'
    ) as HTMLButtonElement;
    await userEvent.click(trigger);

    await waitFor(() => {
      expect(getWidgetShadow(canvasElement).textContent).toContain(
        "このサイトのブロックを解除"
      );
    });

    const removeTextarea = getWidgetShadow(canvasElement).querySelector(
      "textarea[readonly]"
    ) as HTMLTextAreaElement | null;
    expect(removeTextarea?.value).toBe("*://*.spammy-example.com/*");
  },
};
