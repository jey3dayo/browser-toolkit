import type { Theme } from "@/ui/theme";

export type CopyTitleLinkFailure = {
  occurredAt: number;
  tabId: number;
  pageTitle: string;
  pageUrl: string;
  text: string;
  error: string;
};

export type LocalStorageData = {
  openaiApiToken?: string;
  openaiCustomPrompt?: string;
  openaiModel?: string;
  theme?: Theme;
  lastCopyTitleLinkFailure?: CopyTitleLinkFailure;
};
