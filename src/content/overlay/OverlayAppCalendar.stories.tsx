import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

import { OverlayAppStory } from "@/content/overlay/OverlayApp.story-helpers";
import type { ExtractedEvent } from "@/shared_types";

const CONTEXT_SELECTION_TEXT =
  "来週の定例ミーティングは2/12(木)10:00-11:00、Google Meetで実施します。";
const CONTEXT_SELECTION_SECONDARY = `選択範囲:\n${CONTEXT_SELECTION_TEXT}`;
const CALENDAR_EVENT: ExtractedEvent = {
  description: "進捗共有と課題確認",
  end: "2026-02-12T11:00:00+09:00",
  location: "Google Meet",
  start: "2026-02-12T10:00:00+09:00",
  title: "プロジェクト定例ミーティング",
};
const CALENDAR_PRIMARY_TEXT = [
  `タイトル: ${CALENDAR_EVENT.title}`,
  `日時: ${CALENDAR_EVENT.start} 〜 ${CALENDAR_EVENT.end ?? ""}`.trim(),
  `場所: ${CALENDAR_EVENT.location ?? ""}`.trim(),
  "",
  "概要:",
  CALENDAR_EVENT.description ?? "",
].join("\n");
const CALENDAR_URL = "https://calendar.google.com/";
const CALENDAR_ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "SUMMARY:プロジェクト定例ミーティング",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\n");

const meta = {
  argTypes: {
    calendarUrl: { control: false },
    event: { control: false },
    ics: { control: false },
    mode: { control: false },
    primary: {
      control: "text",
    },
    secondary: {
      control: "text",
    },
    source: { control: false },
    status: { control: false },
    title: { control: false },
  },
  component: OverlayAppStory,
  tags: ["test"],
  title: "Content/Overlay/App/カレンダー",
} satisfies Meta<typeof OverlayAppStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CalendarReady: Story = {
  args: {
    calendarUrl: CALENDAR_URL,
    event: CALENDAR_EVENT,
    ics: CALENDAR_ICS,
    mode: "event",
    primary: CALENDAR_PRIMARY_TEXT,
    secondary: CONTEXT_SELECTION_SECONDARY,
    source: "selection",
    status: "ready",
    title: "カレンダー登録",
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const host = canvasElement.querySelector<HTMLDivElement>(
        "#browser-toolkit-overlay"
      );
      const shadow = host?.shadowRoot ?? null;
      expect(shadow?.querySelector(".mbu-overlay-event-table")).toBeTruthy();
    });

    const host = canvasElement.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    const bodyActions = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-body-actions"
    );
    const headerActions = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-actions"
    );
    const quote = shadow?.querySelector<HTMLElement>(".mbu-overlay-quote");

    expect(shadow?.textContent).toContain("プロジェクト定例ミーティング");
    expect(shadow?.textContent).toContain("Google Meet");
    expect(bodyActions?.textContent).toContain("Googleカレンダーに登録");
    expect(bodyActions?.textContent).toContain(".ics");
    expect(
      bodyActions?.querySelector('[data-testid="overlay-copy"]')
    ).toBeTruthy();
    expect(
      headerActions?.querySelector('[data-testid="overlay-copy"]')
    ).toBeNull();
    expect(quote?.textContent).toContain("Google Meet");
  },
};
