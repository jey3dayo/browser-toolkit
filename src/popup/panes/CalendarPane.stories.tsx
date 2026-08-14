import { Result } from "@praha/byethrow";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  CalendarPane,
  type CalendarPaneProps,
} from "@/popup/panes/CalendarPane";
import type { SummarizeEventRequest } from "@/popup/runtime";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function CalendarPaneStory(props: CalendarPaneProps): React.JSX.Element {
  return <CalendarPane {...props} />;
}

const meta = {
  argTypes: {
    focusTokenInput: { control: false },
    navigateToPane: { control: false },
    notify: { control: false },
    runtime: { control: false },
  },
  component: CalendarPaneStory,
  tags: ["test"],
  title: "Popup/Panes/Calendar",
} satisfies Meta<typeof CalendarPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    focusTokenInput: fn(),
    navigateToPane: fn(),
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      background: {
        summarizeEvent: (_message: SummarizeEventRequest) =>
          Result.succeed({
            calendarUrl:
              "https://calendar.google.com/calendar/render?action=TEMPLATE",
            event: {
              description: "storybook description",
              end: "2025-01-01T11:00:00+09:00",
              location: "オンライン",
              start: "2025-01-01T10:00:00+09:00",
              title: "storybook event",
            },
            eventText: "イベント要約（storybook）",
          }),
      },
      local: { openaiApiToken: "sk-storybook" },
      summaryTarget: {
        source: "selection",
        text: "storybook summary target",
        title: "storybook title",
        url: "https://example.com",
      },
      sync: { calendarTargets: ["google", "ics"] },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByRole("button", { name: "抽出する" })).toBeTruthy();
    });

    await userEvent.click(canvas.getByRole("button", { name: "抽出する" }));

    await waitFor(() => {
      expect(args.notify.success).toHaveBeenCalledWith("完了しました");
      expect(
        (canvas.getByTestId("calendar-output") as HTMLTextAreaElement).value
      ).toContain("イベント要約（storybook）");
      expect(canvas.getByTestId("calendar-source").textContent).toContain(
        "選択範囲"
      );
      expect(canvas.getByTestId("calendar-open-google")).toBeEnabled();
      expect(canvas.getByTestId("calendar-download-ics")).toBeEnabled();
    });
  },
};
