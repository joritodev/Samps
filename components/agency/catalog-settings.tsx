"use client";

import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  toggleCatalogActiveAction,
  upsertContentTypeAction,
  upsertPriorityAction,
  upsertStatusAction,
} from "@/lib/actions/settings.actions";
import { cn } from "@/lib/utils";

export type CatalogKind = "contentType" | "priority" | "status";

export type CatalogRow = {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
  sortOrder?: number;
  weight?: number;
  isFinal?: boolean;
  isActive: boolean;
};

export function CatalogSettings({
  title,
  description,
  kind,
  rows,
  showColor = false,
  showWeight = false,
  showFinal = false,
}: {
  title: string;
  description: string;
  kind: CatalogKind;
  rows: CatalogRow[];
  showColor?: boolean;
  showWeight?: boolean;
  showFinal?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [weight, setWeight] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  const [isFinal, setIsFinal] = useState(false);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setName("");
    setColor("#64748b");
    setWeight("0");
    setSortOrder(String(rows.length));
    setIsFinal(false);
  }

  function startEdit(row: CatalogRow) {
    setCreating(false);
    setEditingId(row.id);
    setName(row.name);
    setColor(row.color ?? "#64748b");
    setWeight(String(row.weight ?? 0));
    setSortOrder(String(row.sortOrder ?? 0));
    setIsFinal(row.isFinal ?? false);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
  }

  function save() {
    startTransition(async () => {
      const base = {
        id: editingId ?? undefined,
        name,
        sortOrder: Number(sortOrder) || 0,
        isActive: true,
      };
      let r;
      if (kind === "contentType") {
        r = await upsertContentTypeAction(base);
      } else if (kind === "priority") {
        r = await upsertPriorityAction({
          ...base,
          color,
          weight: Number(weight) || 0,
        });
      } else {
        r = await upsertStatusAction({
          ...base,
          color,
          isFinal,
        });
      }
      if ("success" in r && r.success) {
        toast.success("Salvo");
        cancel();
      } else {
        toast.error("error" in r ? r.error : "Erro");
      }
    });
  }

  function toggle(row: CatalogRow) {
    startTransition(async () => {
      const r = await toggleCatalogActiveAction({
        kind,
        id: row.id,
        isActive: !row.isActive,
      });
      if ("success" in r && r.success) {
        toast.success(row.isActive ? "Desativado" : "Ativado");
      } else {
        toast.error("error" in r ? r.error : "Erro");
      }
    });
  }

  const formOpen = creating || !!editingId;

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button size="sm" onClick={startCreate} disabled={pending}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {formOpen && (
          <div className="mb-6 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">
              {creating ? "Novo item" : "Editar"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {showColor && (
                <div className="space-y-1">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
              )}
              {showWeight && (
                <div className="space-y-1">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              {showFinal && (
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={isFinal} onCheckedChange={setIsFinal} />
                  <Label>Status final</Label>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending || !name.trim()} onClick={save}>
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={cancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3",
                !row.isActive && "opacity-60"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {row.color && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                  )}
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.name}
                  </p>
                  {!row.isActive && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                  {row.isFinal && <Badge variant="outline">Final</Badge>}
                </div>
                {row.slug && (
                  <p className="text-xs text-muted-foreground">{row.slug}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => startEdit(row)}
                >
                  Editar
                </Button>
                <Switch
                  checked={row.isActive}
                  disabled={pending}
                  onCheckedChange={() => toggle(row)}
                />
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
