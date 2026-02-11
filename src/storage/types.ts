import type { Theme } from "@/ui/theme";
import type { LinkFormat } from "@/utils/link_format";

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
  aiApiToken?: string; // アクティブプロバイダーのトークン
  aiModel?: string; // アクティブプロバイダーのモデル
  aiCustomPrompt?: string; // 共有カスタムプロンプト
  // 旧OpenAI専用キー（マイグレーション用に維持）
  openaiApiToken?: string;
  openaiCustomPrompt?: string;
  openaiModel?: string;
  // その他の設定
  theme?: Theme;
  lastCopyTitleLinkFailure?: CopyTitleLinkFailure;
  debugMode?: boolean;
};
