import type { Result } from "@praha/byethrow";
import { persistWithRollback } from "@/popup/utils/persist";
import { runWithSharedLock } from "@/utils/async";

export type PreparedMutation<T> = {
  next: T;
  applyNext: () => void;
  onSuccess?: () => void;
  onFailure: () => void;
};

export type VerifiedMutationConfig<T> = {
  lockName: string;
  maxAttempts?: number;
  readLatest: () => Promise<T | null>;
  save: (next: T) => Promise<Result.Result<void, string>>;
  isPersisted: (stored: T, next: T) => boolean;
  getCurrent: () => T;
  applyRollback: (previous: T) => void;
};

const DEFAULT_MAX_ATTEMPTS = 5;

export function createVerifiedMutationRunner<T>(
  config: VerifiedMutationConfig<T>
): (prepare: (base: T) => PreparedMutation<T> | null) => Promise<void> {
  const maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const runAttempts = async (
    prepare: (base: T) => PreparedMutation<T> | null
  ): Promise<void> => {
    const previous = config.getCurrent();
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      // biome-ignore lint/performance/noAwaitInLoops: intentional serial optimistic-concurrency retries
      const latest = await config.readLatest();
      const base = latest ?? previous;
      const mutation = prepare(base);
      if (!mutation) {
        return;
      }
      const saved = await persistWithRollback({
        applyNext: mutation.applyNext,
        onFailure: mutation.onFailure,
        persist: () => config.save(mutation.next),
        rollback: () => {
          config.applyRollback(previous);
        },
      });
      if (!saved) {
        return;
      }
      const stored = await config.readLatest();
      if (stored === null || config.isPersisted(stored, mutation.next)) {
        mutation.onSuccess?.();
        return;
      }
    }
  };

  return (prepare) =>
    runWithSharedLock(config.lockName, () => runAttempts(prepare));
}
