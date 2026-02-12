/**
 * API Endpoints - ホワイトリスト管理
 *
 * セキュリティ: すべての外部API呼び出しはこのホワイトリストで管理されます。
 * manifest.jsonのcontent_security_policyと一致させる必要があります。
 */

/**
 * 許可されたAPIエンドポイント（Origin）
 */
export const ALLOWED_API_ORIGINS = [
  "https://api.openai.com",
  "https://api.anthropic.com",
  "https://api.z.ai",
] as const;

/**
 * 許可されたAPIエンドポイント型
 */
export type AllowedApiOrigin = (typeof ALLOWED_API_ORIGINS)[number];

/**
 * URLがホワイトリストに含まれているかチェック
 *
 * @param url - チェックするURL
 * @returns ホワイトリストに含まれている場合はtrue
 */
export function isAllowedApiOrigin(url: string): boolean {
  try {
    const origin = new URL(url).origin;
    return ALLOWED_API_ORIGINS.includes(origin as AllowedApiOrigin);
  } catch {
    // 無効なURL
    return false;
  }
}

/**
 * ホワイトリストチェック付きfetch
 *
 * @param url - APIエンドポイントURL
 * @param options - fetchオプション
 * @throws Error ホワイトリストに含まれていない場合
 */
export async function fetchWithOriginCheck(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (!isAllowedApiOrigin(url)) {
    const origin = new URL(url).origin;
    throw new Error(
      `Disallowed API origin: ${origin}. Allowed origins: ${ALLOWED_API_ORIGINS.join(", ")}`
    );
  }

  return fetch(url, options);
}
