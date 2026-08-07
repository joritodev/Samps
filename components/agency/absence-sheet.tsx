"use client";

import { useEffect, useState, useTransition } from "react";
import { AbsenceKind } from "@prisma/client";
import { toast } from "sonner";
import { createAbsence } from "@/app/actions/absences";
import { ABSENCE_KIND_LABEL } from "@/lib/agency/absences";
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

const KIND_OPTIONS = Object.values(AbsenceKind);

export type AbsenceMemberOption = {
  id: string;
  name: string;
};

export function AbsenceSheet({
  open,
  onOpenChange,
  currentUserId,
  defaultUserId,
  members,
  canManageOthers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  defaultUserId?: string;
  members: AbsenceMemberOption[];
  canManageOthers: boolean;
}) {
  const [userId, setUserId] = useState(defaultUserId ?? currentUserId);
  const [kind, setKind] = useState<AbsenceKind>(AbsenceKind.DAY_OFF);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setUserId(defaultUserId ?? currentUserId);
      setKind(AbsenceKind.DAY_OFF);
      setStartsAt("");
      setEndsAt("");
      setNote("");
    }
  }, [open, defaultUserId, currentUserId]);

  function submit() {
    if (!startsAt || !endsAt) {
      toast.error("Informe início e fim.");
      return;
    }

    startTransition(async () => {
      const result = await createAbsence({
        userId,
        kind,
        startsAt,
        endsAt,
        note: note.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ausência registrada.");
      onOpenChange(false);
    });
  }

  const showMemberSelect = canManageOthers && members.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle>Registrar ausência</SheetTitle>
          <SheetDescription>
            Folga, férias ou indisponibilidade visível para o time.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {showMemberSelect ? (
            <div className="space-y-2">
              <Label htmlFor="absence-user">Pessoa</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="absence-user">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.id === currentUserId ? " (você)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="absence-kind">Tipo</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as AbsenceKind)}
            >
              <SelectTrigger id="absence-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ABSENCE_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="absence-start">Início</Label>
              <Input
                id="absence-start"
                type="date"
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value);
                  if (!endsAt) setEndsAt(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="absence-end">Fim</Label>
              <Input
                id="absence-end"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="absence-note">Observação (opcional)</Label>
            <Textarea
              id="absence-note"
              value={note}
              maxLength={200}
              rows={3}
              placeholder="Ex.: viagem, consulta…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <Button className="w-full" disabled={pending} onClick={submit}>
            {pending ? "Salvando…" : "Registrar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
