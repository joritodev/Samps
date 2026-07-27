"use server";

import {
  isSearchType,
  type SearchHit,
  type SearchType,
} from "@/lib/agency/search-types";
import { requireAuth } from "@/lib/permissions/check";
import { globalSearch } from "@/lib/services/search.service";

function sanitizeTypes(types?: string[]): SearchType[] {
  if (!types?.length) return [];
  return types.filter(isSearchType);
}

export async function searchEverywhere(
  query: string,
  types?: string[]
): Promise<SearchHit[]> {
  const user = await requireAuth();
  return globalSearch(user, { query, types: sanitizeTypes(types) });
}
