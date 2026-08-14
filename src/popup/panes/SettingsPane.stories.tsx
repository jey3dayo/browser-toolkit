import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { SettingsPane } from "@/popup/panes/SettingsPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";
import { PROVIDER_CONFIGS } from "@/schemas/provider";

function SettingsPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  const tokenInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <SettingsPane
      notify={props.notify}
      runtime={props.runtime}
      tokenInputRef={tokenInputRef}
    />
  );
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: SettingsPaneStory,
  tags: ["test"],
  title: "Popup/Panes/Settings",
} satisfies Meta<typeof SettingsPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const tokenInput = canvas.getByTestId("ai-token");
    await userEvent.clear(tokenInput);
    await userEvent.type(tokenInput, "sk-test");

    await userEvent.click(canvas.getByTestId("token-save"));
    await waitFor(() => {
      expect(args.notify.success).toHaveBeenCalledWith("保存しました");
    });

    await userEvent.click(canvas.getByTestId("token-visible"));
    await userEvent.click(canvas.getByTestId("token-visible"));
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: {
        aiCustomPrompt: "日本語で要点を整理してください",
        aiModel: PROVIDER_CONFIGS.anthropic.defaultModel,
        aiProvider: "anthropic",
        anthropicApiToken: "sk-ant-story",
        theme: "dark",
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByTestId("settings-overview")).toBeTruthy();
      expect(canvas.getByTestId("settings-overview").textContent).toContain(
        "AI設定はこの端末のみ"
      );
      const token = canvas.getByTestId("ai-token") as HTMLInputElement;
      const prompt = canvas.getByTestId("custom-prompt") as HTMLTextAreaElement;
      expect(token).toBeTruthy();
      expect(token.value).toBe("sk-ant-story");
      expect(prompt.value).toBe("日本語で要点を整理してください");
      expect(canvas.getByTestId("theme-primary-options").textContent).toContain(
        "ダーク"
      );
      expect(canvas.getByTestId("theme-primary-options").textContent).toContain(
        "ライト"
      );
      expect(canvas.getByTestId("theme-auto-option").textContent).toContain(
        "自動"
      );
    });
  },
};
