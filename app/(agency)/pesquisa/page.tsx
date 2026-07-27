import { SearchResults } from "@/components/agency/search-results";
import { isSearchType } from "@/lib/agency/search-types";
import { requireAuth } from "@/lib/permissions/check";
import { allowedSearchTypes, globalSearch } from "@/lib/services/search.service";

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function PesquisaPage({
  searchParams,
}: {
  searchParams: { q?: string; tipo?: string | string[] };
}) {
  const user = await requireAuth();
  const query = searchParams.q ?? "";

  const allowed = allowedSearchTypes(user);
  const selected = toArray(searchParams.tipo).filter(isSearchType);

  const hits = query ? await globalSearch(user, { query, types: selected }) : [];

  return (
    <SearchResults
      query={query}
      hits={hits}
      allowedTypes={allowed}
      selectedTypes={selected}
    />
  );
}
