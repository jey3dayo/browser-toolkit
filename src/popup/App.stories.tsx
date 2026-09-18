import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { PopupApp, type PopupAppProps } from "./App";
import { navigationItems } from "./navigation-items";

function PopupAppStory(props: PopupAppProps): React.JSX.Element {
  return <PopupApp {...props} />;
}

const meta = {
  args: {
    surface: "popup",
  },
  component: PopupAppStory,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["test"],
  title: "Popup/App",
} satisfies Meta<typeof PopupAppStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Options: Story = {
  args: {
    surface: "options",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getAllByRole("tab")).toHaveLength(navigationItems.length);
    expect(canvas.getByRole("tab", { name: "アクション" })).toBeTruthy();

    await userEvent.click(canvas.getByRole("tab", { name: "設定" }));
    await waitFor(() => {
      expect(canvas.getByRole("button", { name: "デバッグ" })).toBeTruthy();
    });

    const debugTrigger = canvas.getByRole("button", { name: "デバッグ" });
    expect(debugTrigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(debugTrigger);
    await waitFor(() => {
      expect(debugTrigger.getAttribute("aria-expanded")).toBe("true");
      expect(canvas.getByTestId("debug-mode-switch")).toBeTruthy();
    });
  },
};
