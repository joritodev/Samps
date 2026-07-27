"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchEverywhere } from "@/lib/actions/search.actions";
import {
  SEARCH_TYPE_LABEL,
  type SearchHit,
  type SearchType,
} from "@/lib/agency/search-types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "samps.search.types";
const DEBOUNCE_MS = 250;

function readStoredTypes(allowed: SearchType[]): SearchType[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is SearchType =>
      allowed.includes(t as SearchType)
    );
  } catch {
    return [];
  }
}

export function GlobalSearch({ types: allowed }: { types: SearchType[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<SearchType[]>([]);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  // Os filtros sobrevivem entre sessões; a busca em si vive na URL de /pesquisa.
  useEffect(() => {
    setActive(readStoredTypes(allowed));
  }, [allowed]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback(
    async (term: string, filters: SearchType[]) => {
      if (term.trim().length < 2) {
        setHits([]);
        setLoading(false);
        return;
      }

      const id = ++requestId.current;
      setLoading(true);
      const results = await searchEverywhere(term, filters);
      // Descarta respostas de teclas antigas que chegaram fora de ordem.
      if (id !== requestId.current) return;
      setHits(results);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query, active), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, active, runSearch]);

  function toggleType(type: SearchType) {
    setActive((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function go(href: string) {
    setOpen(false);
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(href);
  }

  function seeAll() {
    const params = new URLSearchParams({ q: query });
    for (const type of active) params.append("tipo", type);
    go(`/pesquisa?${params.toString()}`);
  }

  const grouped = allowed
    .map((type) => ({
      type,
      items: hits.filter((hit) => hit.type === type),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-full justify-start border-border bg-secondary/60 px-3 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left text-sm">Pesquisar</span>
        <kbd className="rounded border border-border bg-background px-1.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Buscar clientes, demandas, projetos, arquivos..."
          value={query}
          onValueChange={setQuery}
        />

        <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
          {allowed.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active.includes(type)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {SEARCH_TYPE_LABEL[type]}
            </button>
          ))}
        </div>

        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando…
            </div>
          ) : null}

          {!loading && query.trim().length >= 2 && grouped.length === 0 ? (
            <CommandEmpty>Nenhum resultado para “{query}”.</CommandEmpty>
          ) : null}

          {!loading && query.trim().length < 2 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Digite ao menos 2 caracteres.
            </div>
          ) : null}

          {grouped.map((group) => (
            <CommandGroup
              key={group.type}
              heading={SEARCH_TYPE_LABEL[group.type]}
            >
              {group.items.map((hit) => (
                <CommandItem
                  key={`${hit.type}-${hit.id}`}
                  value={`${hit.type}-${hit.id}-${hit.title}`}
                  onSelect={() => go(hit.href)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {hit.title}
                    </p>
                    {hit.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {grouped.length > 0 ? (
            <CommandGroup>
              <CommandItem value="ver-todos" onSelect={seeAll}>
                Ver todos os resultados
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
