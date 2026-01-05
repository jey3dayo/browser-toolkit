import { Result } from "@praha/byethrow";

type PersistWithRollbackOptions = {
  applyNext: () => void;
  rollback: () => void;
  persist: () => Result.ResultAsync<void, string>;
  onSuccess?: () => void;
  onFailure?: () => void;
};

export async function persistWithRollback(
  options: PersistWithRollbackOptions
): Promise<boolean> {
  options.applyNext();
  const saved = await options.persist();
  if (Result.isSuccess(saved)) {
    options.onSuccess?.();
    return true;
  }
  options.rollback();
  options.onFailure?.();
  return false;
}
