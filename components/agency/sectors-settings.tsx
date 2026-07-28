"use client";

import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { DistributionMethod } from "@prisma/client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  toggleCatalogActiveAction,
  upsertSectorAction,
} from "@/lib/actions/settings.actions";
import { cn } from "@/lib/utils";

const DIST_OPTIONS: { value: DistributionMethod; label: string }[] = [
  { value: "MIXED", label: "Misto" },
  { value: "SELF", label: "Autoatribuição" },
  { value: "LEADER", label: "Líder" },
  { value: "MANAGEMENT", label: "Gestão" },
];

export type SectorSettingsRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  isActive: boolean;
  distributionMethod: DistributionMethod;
  leaderId: string | null;
  leaderName: string | null;
  userCount: number;
};

export function SectorsSettings({
  sectors,
  leaders,
}: {
  sectors: SectorSettingsRow[];
  leaders: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [leaderId, setLeaderId] = useState("");
  const [distributionMethod, setDistributionMethod] =
    useState<DistributionMethod>("MIXED");

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setName("");
    setSlug("");
    setColor("#3b82f6");
    setLeaderId("");
    setDistributionMethod("MIXED");
  }

  function startEdit(row: SectorSettingsRow) {
    setCreating(false);
    setEditingId(row.id);
    setName(row.name);
    setSlug(row.slug);
    setColor(row.color ?? "#3b82f6");
    setLeaderId(row.leaderId ?? "");
    setDistributionMethod(row.distributionMethod);
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
  }

  function save() {
    startTransition(async () => {
      const r = await upsertSectorAction({
        id: editingId ?? undefined,
        name,
        slug: slug || undefined,
        color,
        leaderId: leaderId || null,
        distributionMethod,
        isActive: true,
      });
      if ("success" in r && r.success) {
        toast.success("Setor salvo");
        cancel();
      } else {
        toast.error("error" in r ? r.error : "Erro");
      }
    });
  }

  function toggle(row: SectorSettingsRow) {
    startTransition(async () => {
      const r = await toggleCatalogActiveAction({
        kind: "sector",
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
              Setores
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Equipes operacionais e distribuição
            </p>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto"
                />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 p-1"
                />
              </div>
              <div className="space-y-1">
                <Label>Líder</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={leaderId}
                  onChange={(e) => setLeaderId(e.target.value)}
                >
                  <option value="">—</option>
                  {leaders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Distribuição</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={distributionMethod}
                  onChange={(e) =>
                    setDistributionMethod(e.target.value as DistributionMethod)
                  }
                >
                  {DIST_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
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
          {sectors.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3",
                !row.isActive && "opacity-60"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color ?? "#94a3b8" }}
                  />
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  {!row.isActive && <Badge variant="secondary">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.slug}
                  {row.leaderName ? ` · líder ${row.leaderName}` : ""}
                  {` · ${row.userCount} usuário(s)`}
                </p>
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
        </ul>
      </div>
    </div>
  );
}
