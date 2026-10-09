"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createPresetAction,
  deletePresetAction,
  listPlanTemplatesAction,
  saveClientTemplatesAction,
} from "@/lib/actions/planning.actions";
import type { TemplateInput } from "@/lib/agency/planning/config-input";
import { DURATION_PRESETS, KIND_DURATION_OPTIONS, PLAN_SECTOR_CONFIG } from "@/lib/agency/planning/config";
import type {
  IsoWeek,
  PlanMemberData,
  PlanPresetData,
  PlanSectorSlug,
  PlanTemplateData,
} from "@/lib/agency/planning/types";
import { WEEKDAYS, formatHours } from "@/lib/agency/planning/week";

const selectClass = "h-9 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-900";

export function ClientsDialog({
  slug,
  week,
  clients,
  members,
  presets,
  onClose,
  onChanged,
}: {
  slug: PlanSectorSlug;
  week: IsoWeek;
  clients: { id: string; name: string }[];
  members: PlanMemberData[];
  presets: PlanPresetData[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"clients" | "presets">("clients");
  const [templates, setTemplates] = useState<PlanTemplateData[] | null>(null);
  const [presetList, setPresetList] = useState(presets);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [newPreset, setNewPreset] = useState({ label: "", hours: 1 });

  const reload = useCallback(async () => {
    const result = await listPlanTemplatesAction(slug);
    if ("templates" in result) setTemplates(result.templates);
    else toast.error(result.error);
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addPreset() {
    const result = await createPresetAction(slug, week, newPreset);
    if ("error" in result) return toast.error(result.error);
    setPresetList((prev) => [
      ...prev,
      { id: `novo-${newPreset.label}`, label: newPreset.label.trim(), hours: newPreset.hours, sortOrder: prev.length },
    ]);
    setNewPreset({ label: "", hours: 1 });
    onChanged();
  }

  async function removePreset(preset: PlanPresetData) {
    if (preset.id.startsWith("novo-")) {
      toast.error("Feche e abra de novo para remover um tipo recém-criado.");
      return;
    }
    const result = await deletePresetAction(slug, week, preset.id);
    if ("error" in result) return toast.error(result.error);
    setPresetList((prev) => prev.filter((p) => p.id !== preset.id));
    onChanged();
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clientes e demandas fixas</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button size="sm" variant={tab === "clients" ? "default" : "outline"} onClick={() => setTab("clients")}>
              Clientes
            </Button>
            <Button size="sm" variant={tab === "presets" ? "default" : "outline"} onClick={() => setTab("presets")}>
              Tipos de produção
            </Button>
          </div>

          {tab === "clients" && (
            <div className="space-y-2">
              {templates === null ? (
                <p className="flex items-center text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
                </p>
              ) : (
                clients.map((c) => {
                  const count = templates.filter((t) => t.clientId === c.id).length;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0f1c3f]">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {count} demanda{count === 1 ? "" : "s"} fixa{count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        Editar demandas
                      </Button>
                    </div>
                  );
                })
              )}
              {clients.length === 0 && <p className="text-sm text-slate-500">Nenhum cliente ativo.</p>}
              <p className="pt-1 text-xs text-slate-500">
                Os clientes são os do cadastro do Samps. Para criar ou editar um cliente, use Clientes no menu.
              </p>
            </div>
          )}

          {tab === "presets" && (
            <div className="space-y-2">
              {presetList.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Input value={p.label} readOnly className="bg-slate-50" />
                  <Input value={p.hours} readOnly className="w-24 bg-slate-50" />
                  <Button variant="ghost" size="icon" aria-label={`Remover ${p.label}`} onClick={() => void removePreset(p)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Novo tipo (ex.: Reel simples — 1h)"
                  maxLength={80}
                  value={newPreset.label}
                  onChange={(e) => setNewPreset({ ...newPreset, label: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  className="w-24"
                  value={newPreset.hours}
                  onChange={(e) => setNewPreset({ ...newPreset, hours: Number(e.target.value) || 1 })}
                />
                <Button onClick={() => void addPreset()} disabled={!newPreset.label.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && templates && (
        <ClientTemplatesForm
          slug={slug}
          week={week}
          client={editing}
          initial={templates.filter((t) => t.clientId === editing.id)}
          members={members}
          presets={presetList}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
            onChanged();
          }}
        />
      )}
    </>
  );
}

type Row = {
  key: string;
  id: string | null;
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  weeklyQuantity: number;
  preferredMemberId: string | null;
  preferredWeekday: number | null;
  required: boolean;
};

function ClientTemplatesForm({
  slug,
  week,
  client,
  initial,
  members,
  presets,
  onClose,
  onSaved,
}: {
  slug: PlanSectorSlug;
  week: IsoWeek;
  client: { id: string; name: string };
  initial: PlanTemplateData[];
  members: PlanMemberData[];
  presets: PlanPresetData[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const config = PLAN_SECTOR_CONFIG[slug];
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((t) => ({
      key: t.id,
      id: t.id,
      title: t.title,
      kind: t.kind,
      category: t.category,
      durationHours: t.durationHours,
      weeklyQuantity: t.weeklyQuantity,
      preferredMemberId: t.preferredMemberId,
      preferredWeekday: t.preferredWeekday,
      required: t.required,
    })),
  );
  const [saving, setSaving] = useState(false);
  const durationOptions = presets.length
    ? presets.map((p) => ({ label: p.label, hours: p.hours }))
    : DURATION_PRESETS;

  const patch = (index: number, change: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...change } : r)));

  async function save() {
    setSaving(true);
    const inputs: TemplateInput[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      category: r.category,
      durationHours: r.durationHours,
      weeklyQuantity: r.weeklyQuantity,
      preferredMemberId: r.preferredMemberId,
      preferredWeekday: r.preferredWeekday,
      required: r.required,
    }));
    const result = await saveClientTemplatesAction(slug, week, client.id, inputs);
    setSaving(false);
    if ("error" in result) return toast.error(result.error);
    toast.success("Demandas fixas salvas");
    await onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <p className="text-sm font-semibold text-[#0f1c3f]">Demandas fixas semanais</p>
          {rows.length === 0 && (
            <p className="text-xs text-slate-500">
              Nenhuma demanda fixa. Adicione quantos itens por semana este cliente tem.
            </p>
          )}
          {rows.map((r, index) => {
            const kindOptions = KIND_DURATION_OPTIONS[r.kind] ?? durationOptions;
            return (
              <div key={r.key} className="grid grid-cols-12 items-center gap-2">
                <Input
                  className="col-span-3"
                  placeholder="Nome da demanda"
                  maxLength={120}
                  value={r.title}
                  onChange={(e) => patch(index, { title: e.target.value })}
                />
                <select
                  aria-label="Tipo"
                  className={`col-span-2 ${selectClass}`}
                  value={r.kind}
                  onChange={(e) => patch(index, { kind: e.target.value })}
                >
                  {config.kinds.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Categoria"
                  className={`col-span-2 ${selectClass}`}
                  value={r.category}
                  onChange={(e) => patch(index, { category: e.target.value })}
                >
                  {config.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Duração"
                  className={`col-span-2 ${selectClass}`}
                  value={kindOptions.some((o) => o.hours === r.durationHours) ? r.durationHours : ""}
                  onChange={(e) => e.target.value && patch(index, { durationHours: Number(e.target.value) })}
                >
                  <option value="">Personalizado</option>
                  {kindOptions.map((o) => (
                    <option key={o.label} value={o.hours}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  className="col-span-1"
                  type="number"
                  step="0.25"
                  min="0.25"
                  title="Horas"
                  value={r.durationHours}
                  onChange={(e) => patch(index, { durationHours: Number(e.target.value) || 0.25 })}
                />
                <Input
                  className="col-span-1"
                  type="number"
                  min="1"
                  max="14"
                  title="Quantidade por semana"
                  value={r.weeklyQuantity}
                  onChange={(e) => patch(index, { weeklyQuantity: Number(e.target.value) || 1 })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1"
                  aria-label="Remover demanda"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
                <select
                  aria-label="Responsável"
                  className={`col-span-3 col-start-4 ${selectClass}`}
                  value={r.preferredMemberId ?? ""}
                  onChange={(e) => patch(index, { preferredMemberId: e.target.value || null })}
                >
                  <option value="">Responsável</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Dia preferencial"
                  className={`col-span-3 ${selectClass}`}
                  value={r.preferredWeekday ?? ""}
                  onChange={(e) => patch(index, { preferredWeekday: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Dia preferencial</option>
                  {WEEKDAYS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <label className="col-span-2 flex items-center gap-1 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={r.required}
                    onChange={(e) => patch(index, { required: e.target.checked })}
                  />
                  Obrigatório
                </label>
                <p className="col-span-12 -mt-1 text-[10px] text-slate-400">
                  {formatHours(r.durationHours)} × {r.weeklyQuantity} por semana
                </p>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  key: `novo-${prev.length}-${Date.now()}`,
                  id: null,
                  title: "",
                  kind: config.defaultKind,
                  category: config.defaultCategory,
                  durationHours: 1,
                  weeklyQuantity: 1,
                  preferredMemberId: null,
                  preferredWeekday: null,
                  required: true,
                },
              ])
            }
          >
            + Adicionar demanda
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
