"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProjectAction, updateProjectAction } from "@/lib/actions/projects.actions";
import { PersonPicker } from "@/components/work/person-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export type ProjectFormValues = {
  id?: string;
  clientId: string;
  title: string;
  description: string;
  ownerId: string;
  startDate: string;
  dueDate: string;
  outsideContract: boolean;
  participantIds: string[];
};

const EMPTY: ProjectFormValues = {
  clientId: "",
  title: "",
  description: "",
  ownerId: "",
  startDate: "",
  dueDate: "",
  outsideContract: false,
  participantIds: [],
};

export function ProjectFormSheet({
  open,
  onOpenChange,
  clients,
  users,
  initial,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  /** Com `id`, edita; sem, cria. */
  initial?: ProjectFormValues;
  currentUserId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectFormValues>(EMPTY);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? { ...EMPTY, clientId: clients[0]?.id ?? "", ownerId: currentUserId });
    // Só reinicia ao abrir: as listas chegam como props novas a cada render do pai e apagariam o que a pessoa digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    startTransition(async () => {
      const result =
        editing && initial?.id
          ? await updateProjectAction(initial.id, form)
          : await createProjectAction(form);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Projeto atualizado." : "Projeto criado.");
      onOpenChange(false);
      if (!editing && "id" in result) router.push(`/projetos/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-h-[100dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>{editing ? "Editar projeto" : "Novo projeto"}</SheetTitle>
          <SheetDescription>
            Um projeto reúne as demandas que o cliente pediu para um fim específico, como um evento ou uma campanha.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="project-client">Cliente</Label>
            <Select value={form.clientId} onValueChange={(v) => set("clientId", v)} disabled={editing}>
              <SelectTrigger id="project-client">
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
            <Label htmlFor="project-title">Título</Label>
            <Input
              id="project-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Evento de inauguração"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Descrição (opcional)</Label>
            <Textarea
              id="project-description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="O que o cliente pediu e para quando."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-start">Início</Label>
              <Input id="project-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due">Prazo</Label>
              <Input id="project-due" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-owner">Responsável</Label>
            <Select value={form.ownerId} onValueChange={(v) => set("ownerId", v)}>
              <SelectTrigger id="project-owner">
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

          <PersonPicker
            label="Participantes"
            idPrefix="project-person"
            users={users}
            value={form.participantIds}
            onChange={(ids) => set("participantIds", ids)}
          />

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <Checkbox
              id="project-outside"
              checked={form.outsideContract}
              onCheckedChange={(c) => set("outsideContract", c === true)}
            />
            <div>
              <Label htmlFor="project-outside" className="cursor-pointer">
                Fora do contrato
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque quando o cliente pediu algo além do que o contrato mensal cobre.
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : editing ? "Salvar" : "Criar projeto"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
