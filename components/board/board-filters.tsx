"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BoardFilters({
  lists,
}: {
  lists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="space-y-1">
        <Label className="text-xs">Pesquisar</Label>
        <Input
          placeholder="Título..."
          className="h-9 w-48"
          defaultValue={params.get("search") ?? ""}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Lista</Label>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={params.get("listId") ?? ""}
          onChange={(e) => update("listId", e.target.value)}
        >
          <option value="">Todas</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={params.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="PENDING_PLANNING">Pendente planejamento</option>
          <option value="DEMANDED">Demandada</option>
          <option value="IN_PRODUCTION">Em produção</option>
          <option value="IN_REVIEW">Em revisão</option>
          <option value="PUBLISHED">Publicada</option>
          <option value="DONE">Concluída</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Visível cliente</Label>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={params.get("visible") ?? ""}
          onChange={(e) => update("visible", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
    </div>
  );
}
