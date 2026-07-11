import type { ContextAction } from "@/context_actions";
import type { DomainPatternConfig } from "@/domain-pattern-configs";
import type { FocusOverrideStorageData } from "@/focus-override/patterns";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import type { CalendarRegistrationTarget } from "@/shared_types";
import type { TextTemplate } from "@/text_templates";
import type { Theme } from "@/ui/theme";
import type { LinkFormat } from "@/utils/link_format";

export type ActionHistoryEntry = {
  id: string;
  actionTitle: string;
  text: string;
  createdAt: number;
};

export type CopyTitleLinkFailure = {
  occurredAt: number;
  tabId: number;
  pageTitle: string;
  pageUrl: string;
  text: string;
  error: string;
  format?: LinkFormat;
};

export type LocalStorageData = {
  // 新しいマルチプロバイダー設定キー
  aiProvider?: string; // "openai" | "anthropic" | "zai"
  aiModel?: string; // アクティブプロバイダーのモデル
  aiCustomPrompt?: string; // 共有カスタムプロンプト
  // プロバイダー別トークンキー
  openaiApiToken?: string;
  anthropicApiToken?: string;
  zaiApiToken?: string;
  // 旧OpenAI専用キー（マイグレーション用に維持）
  openaiCustomPrompt?: string;
  openaiModel?: string;
  // その他の設定
  theme?: Theme;
  lastCopyTitleLinkFailure?: CopyTitleLinkFailure;
  debugMode?: boolean;
  actionHistory?: ActionHistoryEntry[];
};

export type SyncStorageData = {
  domainPatternConfigs?: DomainPatternConfig[];
  focusOverridePatterns?: FocusOverrideStorageData["focusOverridePatterns"];
  contextActions?: ContextAction[];
  linkFormat?: LinkFormat;
  calendarTargets?: CalendarRegistrationTarget[];
  searchEngines?: SearchEngine[];
  searchEngineGroups?: SearchEngineGroup[];
  textTemplates?: TextTemplate[];
};
