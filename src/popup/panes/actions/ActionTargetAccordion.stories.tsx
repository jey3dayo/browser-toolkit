import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, userEvent, waitFor, within } from "storybook/test";
import type { SummaryTarget } from "@/popup/runtime";
import { ActionTargetAccordion } from "./ActionTargetAccordion";

function ActionTargetAccordionStory(props: {
  sourceLabel: string;
  target: SummaryTarget;
}): React.JSX.Element {
  return <ActionTargetAccordion {...props} />;
}

const meta = {
  title: "Popup/Panes/Actions/ActionTargetAccordion",
  component: ActionTargetAccordionStory,
  tags: ["test"],
} satisfies Meta<typeof ActionTargetAccordionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectionTarget: Story = {
  args: {
    sourceLabel: "テストソース",
    target: {
      source: "selection",
      text: "これは選択されたテキストです。",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const accordion = canvasElement.querySelector(".mbu-accordion");
    expect(accordion).toBeTruthy();

    const trigger = canvas.getByText("選択したテキスト");
    expect(trigger).toBeTruthy();

    const panel = canvasElement.querySelector(".mbu-accordion-panel");
    expect(panel).toBeTruthy();

    const textarea = canvasElement.querySelector<HTMLTextAreaElement>(
      ".mbu-accordion-text"
    );
    expect(textarea?.value).toBe("これは選択されたテキストです。");

    const copyButton = canvasElement.querySelector<HTMLButtonElement>(
      ".mbu-accordion-copy-btn"
    );
    expect(copyButton).toBeTruthy();
    expect(copyButton?.getAttribute("aria-label")).toBe("テキストをコピー");

    if (copyButton) {
      await userEvent.click(copyButton);
      await waitFor(() => {
        const updatedButton = canvasElement.querySelector<HTMLButtonElement>(
          ".mbu-accordion-copy-btn"
        );
        expect(updatedButton?.getAttribute("aria-label")).toBe(
          "コピーしました"
        );
      });
    }
  },
};

export const PageTarget: Story = {
  args: {
    sourceLabel: "テストソース",
    target: {
      source: "page",
      text: "これはページ本文のテキストです。",
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const trigger = canvas.getByText("ページ本文");
    expect(trigger).toBeTruthy();

    const textarea = canvasElement.querySelector<HTMLTextAreaElement>(
      ".mbu-accordion-text"
    );
    expect(textarea?.value).toBe("これはページ本文のテキストです。");
  },
};

export const LongText: Story = {
  args: {
    sourceLabel: "テストソース",
    target: {
      source: "selection",
      text: "あ".repeat(5000),
    },
  },
  play: ({ canvasElement }) => {
    const textarea = canvasElement.querySelector<HTMLTextAreaElement>(
      ".mbu-accordion-text"
    );
    expect(textarea?.value).toContain("(以下省略)");
    expect(textarea?.value.length).toBeLessThanOrEqual(4010);

    const note = canvasElement.querySelector(".mbu-accordion-note");
    expect(note?.textContent).toContain("長文のため先頭4,000文字のみ表示");
  },
};

export const EmptyText: Story = {
  args: {
    sourceLabel: "テストソース",
    target: {
      source: "selection",
      text: "   ",
    },
  },
  play: ({ canvasElement }) => {
    expect(canvasElement.querySelector(".mbu-accordion")).toBeNull();
  },
};
