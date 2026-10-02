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

async function getPointerInteractions() {
  // Native hover keeps Chromium's pointer state in sync with the widget's document listener.
  if ("__vitest_browser__" in globalThis) {
    return (await import("vitest/browser")).userEvent;
  }
  return userEvent.setup();
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
    const pointer = await getPointerInteractions();
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await pointer.hover(result);

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
    const pointer = await getPointerInteractions();
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await pointer.hover(result);

    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="この検索結果をブロック"]'
        )
      ).toBeTruthy();
    });
    const trigger = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="この検索結果をブロック"]'
    );
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error("block trigger not found");
    }
    await pointer.click(trigger);

    await waitFor(() => {
      const shadow = getWidgetShadow(canvasElement);
      expect(shadow.textContent).toContain("このサイトをブロック");
      expect(shadow.textContent).toContain("spammy-example.com");
    });

    const shadow = getWidgetShadow(canvasElement);
    const popup = shadow.querySelector('[aria-label="このサイトをブロック"]');
    if (!(popup instanceof HTMLElement)) {
      throw new Error("popup not found");
    }

    await waitFor(() => {
      const rect = popup.getBoundingClientRect();
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    });

    await waitFor(() => {
      const triggerRect = trigger.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      expect(Math.abs(popupRect.right - triggerRect.right)).toBeLessThanOrEqual(
        1
      );
      expect(popupRect.top).toBeGreaterThanOrEqual(triggerRect.bottom);
    });

    const addTextarea = popup.querySelector("textarea:not([readonly])");
    if (!(addTextarea instanceof HTMLTextAreaElement)) {
      throw new Error("add-rule textarea not found");
    }
    const popupButtons = Array.from(popup.querySelectorAll("button"));
    const cancelButton = popupButtons.find(
      (button) => button.textContent === "キャンセル"
    );
    if (!(cancelButton instanceof HTMLButtonElement)) {
      throw new Error("cancel button not found");
    }
    const blockButton = popupButtons.find(
      (button) => button.textContent === "ブロック"
    );
    if (!(blockButton instanceof HTMLButtonElement)) {
      throw new Error("block button not found");
    }

    for (const target of [blockButton, cancelButton, addTextarea]) {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const hit = shadow.elementFromPoint(centerX, centerY);
      expect(hit === target || (hit !== null && target.contains(hit))).toBe(
        true
      );
    }

    await waitFor(() => {
      expect(shadow.activeElement).toBe(addTextarea);
    });

    await pointer.click(cancelButton);
    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="このサイトをブロック"]'
        )
      ).toBeNull();
    });
  },
};

export const OutsideClickClosesDialog: Story = {
  args: {
    entries: [makeStoryEntry()],
  },
  play: async ({ canvasElement }) => {
    const pointer = await getPointerInteractions();
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await pointer.hover(result);
    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="この検索結果をブロック"]'
        )
      ).toBeTruthy();
    });
    const trigger = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="この検索結果をブロック"]'
    );
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error("block trigger not found");
    }
    await pointer.click(trigger);

    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="このサイトをブロック"]'
        )
      ).toBeTruthy();
    });

    await pointer.click(result);

    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="このサイトをブロック"]'
        )
      ).toBeNull();
    });
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
    const pointer = await getPointerInteractions();
    const canvas = within(canvasElement);
    const result = canvas.getByTestId("search-blocklist-story-result");

    await pointer.hover(result);
    await waitFor(() => {
      expect(
        getWidgetShadow(canvasElement).querySelector(
          '[aria-label="この検索結果をブロック"]'
        )
      ).toBeTruthy();
    });
    const trigger = getWidgetShadow(canvasElement).querySelector(
      '[aria-label="この検索結果をブロック"]'
    );
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error("block trigger not found");
    }
    await pointer.click(trigger);

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
