export function runSequentially<T>(
  items: readonly T[],
  task: (item: T) => Promise<void>
): Promise<void> {
  return items.reduce(
    (previous, item) => previous.then(() => task(item)),
    Promise.resolve()
  );
}
