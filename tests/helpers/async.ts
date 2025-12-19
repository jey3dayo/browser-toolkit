export async function flush(
  source: Window | typeof setTimeout,
  times = 5
): Promise<void> {
  const setTimeoutFn: (handler: () => void, timeout?: number) => unknown =
    typeof source === "function" ? source : source.setTimeout.bind(source);

  for (let i = 0; i < times; i += 1) {
    await new Promise<void>((resolve) => setTimeoutFn(resolve, 0));
  }
}
