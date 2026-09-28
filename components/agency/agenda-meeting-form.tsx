"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  createAgendaMeetingAction,
  deleteAgendaMeetingAction,
  updateAgendaMeetingAction,
} from "@/lib/actions/agenda-meeting.actions";
import {
  AGENDA_MEETING_KIND_LABEL,
  AGENDA_MEETING_KINDS,
  type AgendaMeetingKind,
} from "@/lib/agency/agenda-meeting";

export type AgendaMeetingFormValue = {
  id: string;
  title: string;
  description?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
  kind?: string | null;
  startsAt: string;
  endsAt?: string | null;
};

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function AgendaMeetingForm({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AgendaMeetingFormValue | null;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AgendaMeetingKind>("MEETING");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    const nextKind = AGENDA_MEETING_KINDS.includes(initial?.kind as AgendaMeetingKind)
      ? (initial?.kind as AgendaMeetingKind)
      : "MEETING";
    setKind(nextKind);
    setStartsAt(toLocalInput(initial?.startsAt));
    setEndsAt(toLocalInput(initial?.endsAt));
    setMeetingUrl(initial?.meetingUrl ?? "");
    setLocation(initial?.location ?? "");
    setDescription(initial?.description ?? "");
    // A troca de reunião remonta o formulário (key no pai).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function payload() {
    return {
      title,
      kind,
      description,
      meetingUrl,
      location,
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
    };
  }

  function save() {
    startTransition(async () => {
      const result = initial
        ? await updateAgendaMeetingAction(initial.id, payload())
        : await createAgendaMeetingAction(payload());
      if ("success" in result && result.success) {
        toast.success(initial ? "Reunião atualizada" : "Reunião marcada");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível salvar");
    });
  }

  function remove() {
    if (!initial) return;
    if (!window.confirm("Apagar esta reunião da agenda?")) return;
    startTransition(async () => {
      const result = await deleteAgendaMeetingAction(initial.id);
      if ("success" in result && result.success) {
        toast.success("Reunião apagada");
        onOpenChange(false);
        return;
      }
      toast.error("error" in result ? result.error : "Não foi possível apagar");
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Editar reunião" : "Nova reunião"}</SheetTitle>
          <SheetDescription>
            Nome, horário, link e o que o time precisa saber. Fica na agenda da equipe.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="meeting-title">Nome</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Alinhamento semanal"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meeting-kind">Tipo</Label>
            <select
              id="meeting-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as AgendaMeetingKind)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {AGENDA_MEETING_KINDS.map((item) => (
                <option key={item} value={item}>
                  {AGENDA_MEETING_KIND_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="meeting-start">Início</Label>
              <Input
                id="meeting-start"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meeting-end">Fim</Label>
              <Input
                id="meeting-end"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="meeting-url">Link da reunião</Label>
            <Input
              id="meeting-url"
              type="url"
              inputMode="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meeting-location">Local</Label>
            <Input
              id="meeting-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Sala ou endereço"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="meeting-description">Descrição</Label>
            <Textarea
              id="meeting-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Pauta, quem fala, o que levar"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={save}>
              Salvar
            </Button>
            {initial ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={remove}
              >
                Apagar
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
