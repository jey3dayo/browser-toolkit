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
