export type SummarySource = 'selection' | 'page';

export type ExtractedEvent = {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  location?: string;
  description?: string;
};
