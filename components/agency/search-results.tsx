"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  SEARCH_TYPE_LABEL,
  type SearchHit,
  type SearchType,
} from "@/lib/agency/search-types";
import { cn } from "@/lib/utils";

export function SearchResults({
  query,
  hits,
  allowedTypes,
  selectedTypes,
}: {
  query: string;
  hits: SearchHit[];
  allowedTypes: SearchType[];
  selectedTypes: SearchType[];
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query);

  // Os filtros vivem na URL, então o resultado é compartilhável e sobrevive ao refresh.
  function navigate(nextTerm: string, nextTypes: SearchType[]) {
    const params = new URLSearchParams();
    if (nextTerm) params.set("q", nextTerm);
    for (const type of nextTypes) params.append("tipo", type);
    router.push(`/pesquisa?${params.toString()}`);
  }

  function toggleType(type: SearchType) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    navigate(term, next);
  }

  const grouped = allowedTypes
    .map((type) => ({ type, items: hits.filter((hit) => hit.type === type) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pesquisa
        </h1>
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(term, selectedTypes);
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar clientes, demandas, projetos, arquivos..."
            className="max-w-xl"
          />
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allowedTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedTypes.includes(type)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {SEARCH_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </header>

      <div className="p-6">
        {!query ? (
          <p className="text-sm text-muted-foreground">
            Digite um termo para começar.
          </p>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
            <SearchX className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground/80">
              Nenhum resultado para “{query}”
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente outro termo ou remova os filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <section key={group.type}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {SEARCH_TYPE_LABEL[group.type]}
                </h2>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {group.items.map((hit) => (
                    <Link
                      key={`${hit.type}-${hit.id}`}
                      href={hit.href}
                      target={hit.href.startsWith("http") ? "_blank" : undefined}
                      className="flex flex-col border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {hit.title}
                      </span>
                      {hit.subtitle ? (
                        <span className="text-xs text-muted-foreground">
                          {hit.subtitle}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
