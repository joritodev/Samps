"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createShootAction, updateShootAction } from "@/lib/actions/shoots.actions";
import { PersonPicker } from "@/components/work/person-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type ShootFormValues = {
  id?: string;
  clientId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  ownerId: string;
  shootType: string;
  notes: string;
  projectId: string;
  participantIds: string[];
  createEditingDemand: boolean;
};

const EMPTY: ShootFormValues = {
  clientId: "",
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  ownerId: "",
  shootType: "",
  notes: "",
  projectId: "",
  participantIds: [],
  createEditingDemand: true,
};

const NONE = "__none__";

export function ShootFormSheet({
  open,
  onOpenChange,
  clients,
  users,
  projects,
  initial,
  currentUserId,
  canCreateDemand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  /** Projetos abertos (qualquer cliente); o formulário filtra pelo cliente escolhido. */
  projects: { id: string; title: string; clientId: string }[];
  initial?: ShootFormValues;
  currentUserId: string;
  /** Sem `demands.create`, a demanda de edição não pode nascer junto. */
  canCreateDemand: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ShootFormValues>(EMPTY);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial ?? {
        ...EMPTY,
        clientId: clients[0]?.id ?? "",
        ownerId: currentUserId,
        createEditingDemand: canCreateDemand,
      }
    );
    // Só reinicia ao abrir: as listas chegam como props novas a cada render do pai e apagariam o que a pessoa digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof ShootFormValues>(key: K, value: ShootFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const clientProjects = projects.filter((p) => p.clientId === form.clientId);

  function submit() {
    startTransition(async () => {
      const result =
        editing && initial?.id ? await updateShootAction(initial.id, form) : await createShootAction(form);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Captação atualizada." : "Captação criada.");
      onOpenChange(false);
      if (!editing && "id" in result) router.push(`/captacoes/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-h-[100dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>{editing ? "Editar captação" : "Nova captação"}</SheetTitle>
          <SheetDescription>
            A gravação ou sessão de fotos. Dela saem as demandas de edição, para o editor saber quando o material chega.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="shoot-client">Cliente</Label>
            <Select
              value={form.clientId}
              onValueChange={(v) => setForm((prev) => ({ ...prev, clientId: v, projectId: "" }))}
              disabled={editing}
            >
              <SelectTrigger id="shoot-client">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shoot-title">Título</Label>
            <Input
              id="shoot-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Captação institucional"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="shoot-date">Data</Label>
              <Input id="shoot-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoot-start">Início</Label>
              <Input id="shoot-start" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoot-end">Fim</Label>
              <Input id="shoot-end" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shoot-location">Local</Label>
              <Input id="shoot-location" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoot-type">Tipo (opcional)</Label>
              <Input
                id="shoot-type"
                value={form.shootType}
                onChange={(e) => set("shootType", e.target.value)}
                placeholder="Ex.: Institucional"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shoot-owner">Responsável</Label>
              <Select value={form.ownerId} onValueChange={(v) => set("ownerId", v)}>
                <SelectTrigger id="shoot-owner">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoot-project">Projeto (opcional)</Label>
              <Select
                value={form.projectId || NONE}
                onValueChange={(v) => set("projectId", v === NONE ? "" : v)}
              >
                <SelectTrigger id="shoot-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem projeto</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PersonPicker
            label="Equipe"
            idPrefix="shoot-person"
            users={users}
            value={form.participantIds}
            onChange={(ids) => set("participantIds", ids)}
          />

          <div className="space-y-2">
            <Label htmlFor="shoot-notes">Observações (opcional)</Label>
            <Textarea id="shoot-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          {!editing ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <Checkbox
                id="shoot-editing"
                checked={form.createEditingDemand}
                disabled={!canCreateDemand}
                onCheckedChange={(c) => set("createEditingDemand", c === true)}
              />
              <div>
                <Label htmlFor="shoot-editing" className="cursor-pointer">
                  Criar a demanda de edição
                </Label>
                <p className="text-xs text-muted-foreground">
                  Nasce no setor de Vídeo, ligada a esta captação, com prazo de 5 dias úteis depois da gravação.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : editing ? "Salvar" : "Criar captação"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
