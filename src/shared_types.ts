export type SummarySource = "selection" | "page";

export type Size = {
  width: number;
  height: number;
};

export type Point = {
  left: number;
  top: number;
};

export type ExtractedEvent = {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  description?: string;
};

export type CalendarRegistrationTarget = "google" | "ics";
