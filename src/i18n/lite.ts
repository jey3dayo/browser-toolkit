import type { TranslationKey } from "@/i18n/keys";
import { resources } from "@/i18n/resources";
import { isRecord } from "@/utils/guards";

function resolve(key: string): string | undefined {
  let node: unknown = resources.ja.translation;
  for (const segment of key.split(".")) {
    if (!isRecord(node)) {
      return;
    }
    node = node[segment];
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: TranslationKey): string {
  return resolve(key) ?? key;
}
