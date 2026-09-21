"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createExtraDemandAction } from "@/app/actions/create-extra-demand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { TaxonomyOption } from "@/types/board-ui";

export type ExtraDemandAssigneeOption = {
  id: string;
  name: string;
  sectorId: string;
  avatarUrl?: string | null;
};

export function ExtraDemandSheet({
  open,
  onOpenChange,
  clientId,
  sectors,
  sectorUsers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  sectors: TaxonomyOption[];
  sectorUsers: ExtraDemandAssigneeOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  const assigneesForSector = useMemo(
    () => sectorUsers.filter((u) => u.sectorId === sectorId),
    [sectorUsers, sectorId]
  );

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setSectorId(sectors[0]?.id ?? "");
    setAssigneeId("");
    setDueDate("");
  }, [open, sectors]);

  useEffect(() => {
    if (!assigneeId) return;
    if (!assigneesForSector.some((u) => u.id === assigneeId)) {
      setAssigneeId("");
    }
  }, [assigneeId, assigneesForSector]);

  function submit() {
    if (!title.trim()) {
      toast.error("Informe o título.");
      return;
    }
    if (!sectorId) {
      toast.error("Selecione o setor.");
      return;
    }
    if (!assigneeId) {
      toast.error("Selecione o responsável.");
      return;
    }

    startTransition(async () => {
      const result = await createExtraDemandAction({
        clientId,
        title,
        description: description.trim() || undefined,
        sectorId,
        assigneeId,
        dueDate: dueDate || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda avulsa criada e atribuída.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-h-[90dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>Demanda avulsa</SheetTitle>
          <SheetDescription>
            Cria uma demanda extra no quadro do cliente e atribui ao
            responsável no Meu Painel.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="extra-demand-title">Título</Label>
            <Input
              id="extra-demand-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Ajuste urgente de arte"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select
                value={sectorId}
                onValueChange={(v) => {
                  setSectorId(v);
                  setAssigneeId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={!sectorId || assigneesForSector.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !sectorId
                        ? "Selecione o setor"
                        : assigneesForSector.length === 0
                          ? "Nenhum usuário no setor"
                          : "Selecione"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assigneesForSector.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-demand-due">Prazo (opcional)</Label>
            <Input
              id="extra-demand-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-demand-desc">Descrição (opcional)</Label>
            <Textarea
              id="extra-demand-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto breve da demanda avulsa."
            />
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <Button className="w-full" disabled={pending} onClick={submit}>
            {pending ? "Criando…" : "Criar demanda avulsa"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
