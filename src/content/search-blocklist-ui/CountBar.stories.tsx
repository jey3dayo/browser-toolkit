import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { CountBarStory } from "./SearchBlocklistUi.story-helpers";

const SUMMARY_TEXT_PATTERN = /3件のサイトを非表示にしました/;

const meta = {
  argTypes: {
    blockedCount: { control: "number" },
  },
  component: CountBarStory,
  tags: ["test"],
  title: "Content/SearchBlocklist/CountBar",
} satisfies Meta<typeof CountBarStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Blocked: Story = {
  args: {
    blockedCount: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => {
      expect(canvas.getByText(SUMMARY_TEXT_PATTERN)).toBeTruthy();
    });

    const toggle = canvas.getByRole("button", { name: "表示" });
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(canvas.getByRole("button", { name: "非表示にする" })).toBeTruthy();
    });
  },
};

export const NoneBlocked: Story = {
  args: {
    blockedCount: 0,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      expect(canvasElement.textContent).toBe("");
    });
  },
};
