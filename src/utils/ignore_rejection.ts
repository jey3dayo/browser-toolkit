import { debugLog } from "@/utils/debug_log";

/**
 * Promise の rejection を無視し、debug log に記録する
 * @param promise - rejection を無視する Promise
 * @param scope - ログに記録するスコープ・理由
 */
export function ignoreRejection<T>(
  promise: Promise<T>,
  scope: string
): Promise<void> {
  return promise
    .then(() => {
      // success: no-op
    })
    .catch((error: unknown) => {
      debugLog("ignore-rejection", scope, {
        error: error instanceof Error ? error.message : String(error),
      }).catch(() => {
        // fail silent: debug log 自体の失敗は無視
      });
    });
}

/**
 * Storybook など UI テスト用の noop ハンドラ
 */
export const NOOP = (): void => {
  // intentionally empty
};
