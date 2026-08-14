import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { TablePane } from "@/popup/panes/TablePane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function TablePaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <TablePane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: TablePaneStory,
  tags: ["test"],
  title: "Popup/Panes/Table",
} satisfies Meta<typeof TablePaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      activeTabId: 1,
      sync: { domainPatternConfigs: [] },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId("enable-table-sort"));
    await waitFor(() => {
      expect(args.notify.success).toHaveBeenCalledWith(
        "テーブルソートを有効化しました"
      );
    });

    await userEvent.type(
      canvas.getByTestId("pattern-input"),
      "example.com/path*"
    );
    await userEvent.click(canvas.getByTestId("pattern-add"));
    await waitFor(() => {
      expect(args.notify.success).toHaveBeenCalledWith("追加しました");
    });
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      activeTab: {
        id: 7,
        title: "Reader",
        url: "https://example.com/reader/42",
      },
      focusOverrideDiagnostic: {
        hasFocus: true,
        hidden: false,
        markerPresent: true,
        visibilityState: "visible",
      },
      sync: {
        domainPatternConfigs: [
          { enableRowFilter: true, pattern: "example.com/foo*" },
          { enableRowFilter: false, pattern: "example.com/bar*" },
        ],
        focusOverridePatterns: ["example.com/reader/*", "example.com/book/*"],
      },
    }),
  },
};
