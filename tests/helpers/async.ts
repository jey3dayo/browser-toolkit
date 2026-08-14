export async function flush(
  source: Window | typeof setTimeout,
  times = 5
): Promise<void> {
  const setTimeoutFn: (handler: () => void, timeout?: number) => unknown =
    typeof source === "function" ? source : source.setTimeout.bind(source);

  await Array.from({ length: times }).reduce<Promise<void>>(
    (previous) =>
      previous.then(
        () => new Promise<void>((resolve) => setTimeoutFn(resolve, 0))
      ),
    Promise.resolve()
  );
}
