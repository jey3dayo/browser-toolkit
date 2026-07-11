import type { ExtractedEvent } from "@/shared_types";

export type OutputState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "ready";
      text: string;
      sourceLabel: string;
      calendarUrl?: string;
      event: ExtractedEvent;
    }
  | { status: "error"; message: string };
