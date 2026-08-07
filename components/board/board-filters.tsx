"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground";

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 w-full flex-1 space-y-1 sm:max-w-56">
        <Label className="text-xs text-muted-foreground">Pesquisar</Label>
        <Input
          placeholder="Título..."
          className="h-9"
          defaultValue={params.get("busca") ?? ""}
          onChange={(e) => update("busca", e.target.value)}
        />
      </div>
      <div className="w-full space-y-1 sm:w-40">
        <Label className="text-xs text-muted-foreground">Lista</Label>
        <select
          className={selectClass}
          value={params.get("lista") ?? ""}
          onChange={(e) => update("lista", e.target.value)}
        >
          <option value="">Todas</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full space-y-1 sm:w-44">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <select
          className={selectClass}
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
      <div className="w-full space-y-1 sm:w-36">
        <Label className="text-xs text-muted-foreground">Visível cliente</Label>
        <select
          className={selectClass}
          value={params.get("visivel") ?? ""}
          onChange={(e) => update("visivel", e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
    </div>
  );
}
