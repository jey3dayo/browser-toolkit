/**
 * セキュリティ: すべての外部API呼び出しはこのホワイトリストで管理する。
 * manifest.json の content_security_policy と一致させること。
 */
export const ALLOWED_API_ORIGINS = [
  "https://api.openai.com",
  "https://api.anthropic.com",
  "https://api.z.ai",
  "https://auth.openai.com",
] as const;

type AllowedApiOrigin = (typeof ALLOWED_API_ORIGINS)[number];

export function isAllowedApiOrigin(url: string): boolean {
  try {
    const { origin } = new URL(url);
    return ALLOWED_API_ORIGINS.includes(origin as AllowedApiOrigin);
  } catch {
    return false;
  }
}
