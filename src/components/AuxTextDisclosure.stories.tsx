import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, userEvent, waitFor, within } from "storybook/test";
import { AuxTextDisclosure } from "./AuxTextDisclosure";

type Props = React.ComponentProps<typeof AuxTextDisclosure>;

function AuxTextDisclosureStory(props: Props): React.JSX.Element | null {
  return <AuxTextDisclosure {...props} />;
}

const meta = {
  title: "Shared/Components/AuxTextDisclosure",
  component: AuxTextDisclosureStory,
  tags: ["test"],
} satisfies Meta<typeof AuxTextDisclosureStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClosedByDefault: Story = {
  args: {
    summary: "選択範囲",
    text: "  引用テキスト  ",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const details = canvasElement.querySelector<HTMLDetailsElement>(
      "details.mbu-overlay-aux"
    );
    expect(details).toBeTruthy();
    if (!details) {
      return;
    }
    expect(details.open).toBe(false);

    const summaryEl = canvas.getByText("選択範囲");

    await userEvent.click(summaryEl);
    await waitFor(() => {
      expect(details.open).toBe(true);
    });

    const quote =
      canvasElement.querySelector<HTMLElement>(".mbu-overlay-quote");
    expect(quote?.textContent).toBe("引用テキスト");

    await userEvent.click(summaryEl);
    await waitFor(() => {
      expect(details.open).toBe(false);
    });
  },
};

export const OpenByDefault: Story = {
  args: {
    summary: "選択範囲",
    text: "引用テキスト",
    defaultOpen: true,
  },
  play: ({ canvasElement }) => {
    const details = canvasElement.querySelector<HTMLDetailsElement>(
      "details.mbu-overlay-aux"
    );
    expect(details?.open).toBe(true);
  },
};

export const EmptyText: Story = {
  args: {
    summary: "選択範囲",
    text: "   ",
  },
  play: ({ canvasElement }) => {
    expect(canvasElement.querySelector("details.mbu-overlay-aux")).toBeNull();
  },
};

export const LongText: Story = {
  args: {
    summary: "長いテキスト",
    text: "これは非常に長いテキストです。複数行にわたって表示されることを確認するためのテスト用のテキストです。適切に折り返され、読みやすく表示される必要があります。",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector<HTMLDetailsElement>(
      "details.mbu-overlay-aux"
    );
    expect(details).toBeTruthy();
    if (!details) {
      return;
    }

    const summaryEl = canvas.getByText("長いテキスト");
    await userEvent.click(summaryEl);
    await waitFor(() => {
      expect(details.open).toBe(true);
    });

    const quote =
      canvasElement.querySelector<HTMLElement>(".mbu-overlay-quote");
    expect(quote?.textContent).toContain("非常に長いテキスト");
    expect(quote?.textContent?.length).toBeGreaterThan(50);
  },
};

export const MultiLineText: Story = {
  args: {
    summary: "複数行テキスト",
    text: "1行目\n2行目\n3行目",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summaryEl = canvas.getByText("複数行テキスト");

    await userEvent.click(summaryEl);
    await waitFor(() => {
      const details = canvasElement.querySelector<HTMLDetailsElement>(
        "details.mbu-overlay-aux"
      );
      expect(details?.open).toBe(true);
    });

    const quote =
      canvasElement.querySelector<HTMLElement>(".mbu-overlay-quote");
    expect(quote?.textContent).toContain("1行目");
    expect(quote?.textContent).toContain("2行目");
    expect(quote?.textContent).toContain("3行目");
  },
};

export const KeyboardNavigation: Story = {
  args: {
    summary: "キーボード操作",
    text: "EnterキーまたはSpaceキーで開閉できます",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const details = canvasElement.querySelector<HTMLDetailsElement>(
      "details.mbu-overlay-aux"
    );
    expect(details).toBeTruthy();
    if (!details) {
      return;
    }

    const summaryEl = canvas.getByText("キーボード操作");
    summaryEl.focus();

    expect(details.open).toBe(false);

    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
      expect(details.open).toBe(true);
    });

    await userEvent.keyboard("{Space}");
    await waitFor(() => {
      expect(details.open).toBe(false);
    });
  },
};
