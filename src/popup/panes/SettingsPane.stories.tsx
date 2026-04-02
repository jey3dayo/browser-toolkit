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
  title: "Popup/Panes/Settings",
  component: SettingsPaneStory,
  tags: ["test"],
  argTypes: {
    runtime: { control: false },
    notify: { control: false },
  },
} satisfies Meta<typeof SettingsPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    runtime: createStoryPopupRuntime(),
    notify: { info: fn(), success: fn(), error: fn() },
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
    runtime: createStoryPopupRuntime({
      local: {
        aiProvider: "anthropic",
        anthropicApiToken: "sk-ant-story",
        aiModel: PROVIDER_CONFIGS.anthropic.defaultModel,
        aiCustomPrompt: "日本語で要点を整理してください",
        theme: "dark",
      },
    }),
    notify: { info: fn(), success: fn(), error: fn() },
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
