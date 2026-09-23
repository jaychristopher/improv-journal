import MiniSearch from "minisearch";

import { MINISEARCH_OPTIONS } from "./search-index-options.mjs";

export const SEARCH_INDEX_URL = "/search-index.json";
/**
 * Re-exported from the shared module so the loader, the builder and the test
 * read one field list. See search-index-options.mjs for why that matters.
 */
export { MINISEARCH_OPTIONS };

let cachedIndex: MiniSearch | null = null;
let pendingIndex: Promise<MiniSearch> | null = null;

export function hasSearchIndex(): boolean {
  return cachedIndex !== null;
}

export async function getSearchIndex(): Promise<MiniSearch> {
  if (cachedIndex) return cachedIndex;
  if (pendingIndex) return pendingIndex;

  pendingIndex = fetch(SEARCH_INDEX_URL)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load search index: ${res.status}`);
      }

      const json = await res.text();
      cachedIndex = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
      return cachedIndex;
    })
    .finally(() => {
      pendingIndex = null;
    });

  return pendingIndex;
}
