import type { SearchResultEntry } from "../types";

export type SearchEngineAdapter = {
  id: string;
  matches: (location: Location) => boolean;
  findResults: (root: ParentNode) => SearchResultEntry[];
};
