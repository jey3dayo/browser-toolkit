import { Result } from "@praha/byethrow";
import { toErrorMessage } from "@/utils/errors";

export function hasChromeApi<T extends keyof typeof chrome>(
  isExtensionPage: boolean,
  apiName: T
): boolean {
  return (
    isExtensionPage && apiName in (chrome as unknown as Record<string, unknown>)
  );
}

export async function wrapChromeApi<T>(
  operation: (
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ) => void,
  errorMessage: string
): Promise<Result.Result<T, string>> {
  return await Result.try({
    catch: (error) => toErrorMessage(error, errorMessage),
    try: () =>
      new Promise<T>((resolve, reject) => {
        operation(resolve, reject);
      }),
  });
}
