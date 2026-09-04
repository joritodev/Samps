"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DemandType } from "@prisma/client";
import { toast } from "sonner";
import { createDemandAction } from "@/app/actions/create-demand";
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

const TYPE_OPTIONS: { value: DemandType; label: string }[] = [
  { value: DemandType.FEED, label: "Feed" },
  { value: DemandType.STORY, label: "Story" },
  { value: DemandType.REEL, label: "Reel" },
  { value: DemandType.VIDEO, label: "Vídeo" },
  { value: DemandType.DESIGN, label: "Design" },
  { value: DemandType.COPY, label: "Copy" },
  { value: DemandType.OTHER, label: "Outro" },
];

export function NewDemandSheet({
  open,
  onOpenChange,
  clients,
  sectors,
  priorities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: TaxonomyOption[];
  sectors: TaxonomyOption[];
  priorities: TaxonomyOption[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("");
  const [type, setType] = useState<DemandType>(DemandType.FEED);
  const [sectorId, setSectorId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setClientId(clients[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setFormat("");
    setType(DemandType.FEED);
    setSectorId(sectors[0]?.id ?? "");
    setPriorityId(priorities[0]?.id ?? "");
    setDueDate("");
  }, [open, clients, sectors, priorities]);

  function submit() {
    if (!clientId || !title.trim()) {
      toast.error("Informe cliente e título.");
      return;
    }

    startTransition(async () => {
      const result = await createDemandAction({
        clientId,
        title,
        description: description.trim() || undefined,
        format: format.trim() || undefined,
        type,
        sectorId: sectorId || undefined,
        priorityId: priorityId || undefined,
        dueDate: dueDate || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda criada. Complete o briefing para demandar o setor.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-h-[90dvh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>Nova demanda</SheetTitle>
          <SheetDescription>
            Cria um cartão em planejamento. Depois, conclua o briefing para
            enviar ao setor.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="demand-client">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="demand-client">
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
            <Label htmlFor="demand-title">Título</Label>
            <Input
              id="demand-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Carrossel lançamento"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as DemandType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="demand-format">Formato (opcional)</Label>
              <Input
                id="demand-format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="Ex.: 1080x1080"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
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
              <Label>Prioridade</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demand-due">Prazo (opcional)</Label>
            <Input
              id="demand-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demand-desc">Briefing inicial (opcional)</Label>
            <Textarea
              id="demand-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pode completar depois ao demandar o setor."
            />
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <Button className="w-full" disabled={pending} onClick={submit}>
            {pending ? "Criando…" : "Criar demanda"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
