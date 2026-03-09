// 遅延ローダーファクトリ

function unwrapModule<T>(module: T | { default: T }): T {
  if (module && typeof module === "object" && "default" in module) {
    return (module as { default: T }).default;
  }
  return module as T;
}

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
      module = unwrapModule(await promise);
      return module;
    } catch {
      promise = null;
      return null;
    }
  };
}
