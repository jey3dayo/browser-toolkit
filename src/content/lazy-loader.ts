// 遅延ローダーファクトリ

export function createLazyLoader<T>(
  importFn: () => Promise<T>
): () => Promise<T | null> {
  let module: T | null = null;
  let promise: Promise<T> | null = null;
  return async (): Promise<T | null> => {
    if (module) {
      return module;
    }
    if (!promise) {
      promise = importFn();
    }
    try {
      module = await promise;
      return module;
    } catch {
      promise = null;
      return null;
    }
  };
}
