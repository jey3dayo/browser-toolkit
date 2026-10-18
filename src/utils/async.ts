export function runSequentially<T>(
  items: readonly T[],
  task: (item: T) => Promise<void>
): Promise<void> {
  return items.reduce(
    (previous, item) => previous.then(() => task(item)),
    Promise.resolve()
  );
}

export type ExclusiveQueue = {
  runExclusive: <T>(task: () => Promise<T>) => Promise<T>;
};

export function createExclusiveQueue(): ExclusiveQueue {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    runExclusive: <T>(task: () => Promise<T>): Promise<T> => {
      const run = tail.then(() => task());
      tail = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

const SHARED_LOCK_PREFIX = "browser-toolkit:";

const sharedFallbackQueues = new Map<string, ExclusiveQueue>();

export function runWithSharedLock<T>(
  name: string,
  task: () => Promise<T>
): Promise<T> {
  // Web Locks は同一 origin の document 間（popup / options など）で共有され、
  // locks が無い realm（テスト環境など）では realm 内で共有される module-level
  // queue にフォールバックする。保存直列化はこの2経路のどちらか一方だけでしか
  // 保証されないため、呼び出し側の verify/retry は維持する。
  const lockManager = globalThis.navigator?.locks;
  if (typeof lockManager?.request === "function") {
    return lockManager.request(`${SHARED_LOCK_PREFIX}${name}`, task);
  }

  let queue = sharedFallbackQueues.get(name);
  if (!queue) {
    queue = createExclusiveQueue();
    sharedFallbackQueues.set(name, queue);
  }
  return queue.runExclusive(task);
}
