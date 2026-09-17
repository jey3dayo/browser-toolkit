import { googleAdapter } from "./google";
import type { SearchEngineAdapter } from "./types";

export const searchEngineAdapters: SearchEngineAdapter[] = [googleAdapter];

export function findAdapterForLocation(
  location: Location
): SearchEngineAdapter | undefined {
  return searchEngineAdapters.find((adapter) => adapter.matches(location));
}
