"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnnouncementKind } from "@prisma/client";
import { toast } from "sonner";
import {
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncement,
} from "@/app/actions/announcements";
import { AvisoItem } from "@/components/agency/mural-popover";
import { AlertCard } from "@/components/notifications/alert-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  kind: AnnouncementKind;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  authorName: string;
};

const KIND_LABEL: Record<AnnouncementKind, string> = {
  INFO: "Informativo",
  URGENT: "Urgente",
  CELEBRATION: "Celebração",
};

type Status = "Ativo" | "Agendado" | "Expirado" | "Inativo";

export function announcementStatus(
  item: Pick<AnnouncementRow, "active" | "startsAt" | "endsAt">,
  now: Date = new Date()
): Status {
  if (!item.active) return "Inativo";
  if (new Date(item.startsAt) > now) return "Agendado";
  if (item.endsAt && new Date(item.endsAt) < now) return "Expirado";
  return "Ativo";
}

const STATUS_CLASS: Record<Status, string> = {
  Ativo: "bg-success/10 text-success",
  Agendado: "bg-primary/10 text-primary",
  Expirado: "bg-secondary text-muted-foreground",
  Inativo: "bg-secondary text-muted-foreground",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-border bg-card">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "border-r border-border px-3 py-1.5 text-xs font-medium outline-none last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            value === o.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AnnouncementsManager({
  initialItems,
}: {
  initialItems: AnnouncementRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<AnnouncementKind>(AnnouncementKind.INFO);
  const [schedule, setSchedule] = useState<"now" | "later">("now");
  const [startsAt, setStartsAt] = useState("");
  const [expires, setExpires] = useState<"never" | "date">("never");
  const [endsAt, setEndsAt] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function resetForm() {
    setTitle("");
    setMessage("");
    setKind(AnnouncementKind.INFO);
    setSchedule("now");
    setStartsAt("");
    setExpires("never");
    setEndsAt("");
  }

  function handleCreate() {
    const start = schedule === "later" ? startsAt : "";
    const end = expires === "date" ? endsAt : "";
    startTransition(async () => {
      const result = await createAnnouncement({
        title,
        message,
        kind,
        startsAt: start || undefined,
        endsAt: end || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (start && new Date(start) > new Date()) {
        toast.success("Aviso agendado. Ele aparece a partir da data de início.");
      } else {
        toast.success("Aviso publicado");
      }
      resetForm();
      router.refresh();
      setItems((prev) => [
        {
          id: result.id!,
          title: title.trim(),
          message: message.trim(),
          kind,
          startsAt: start ? new Date(start).toISOString() : new Date().toISOString(),
          endsAt: end ? new Date(end).toISOString() : null,
          active: true,
          authorName: "Você",
        },
        ...prev,
      ]);
    });
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleAnnouncement(id, active);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active } : item))
      );
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAnnouncement(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Aviso removido");
    });
  }

  const previewTitle = title.trim() || "Título do aviso";
  const previewMessage = message.trim() || "A mensagem aparece aqui.";
  const previewKind =
    kind === AnnouncementKind.URGENT ? "URGENT" : kind === AnnouncementKind.CELEBRATION ? "CELEBRATION" : "INFO";

  return (
    <div className="space-y-5 p-6">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-1 rounded-xl border border-border/80 bg-card p-5 shadow-xs">
          <h2 className="font-display text-[15px] font-semibold">Novo aviso</h2>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="aviso-title">Título</Label>
              <Input
                id="aviso-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Reunião geral às 16h"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aviso-message">Mensagem</Label>
              <Textarea
                id="aviso-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div>
                <Segmented
                  label="Tipo"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: AnnouncementKind.INFO, label: "Informativo" },
                    { value: AnnouncementKind.URGENT, label: "Urgente" },
                    { value: AnnouncementKind.CELEBRATION, label: "Celebração" },
                  ]}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {kind === AnnouncementKind.URGENT
                  ? "Urgente fica na tela até a pessoa clicar em Entendi. Não é um erro do sistema."
                  : kind === AnnouncementKind.CELEBRATION
                    ? "Celebração: pop-up discreto e destaque em tom quente nos Avisos."
                    : "Informativo: pop-up discreto que some sozinho."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Quando publicar</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label="Quando publicar"
                  value={schedule}
                  onChange={setSchedule}
                  options={[
                    { value: "now", label: "Agora" },
                    { value: "later", label: "Agendar" },
                  ]}
                />
                {schedule === "later" ? (
                  <Input
                    aria-label="Data e hora de início"
                    type="datetime-local"
                    className="h-9 w-auto"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sai do ar</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label="Sai do ar"
                  value={expires}
                  onChange={setExpires}
                  options={[
                    { value: "never", label: "Sem data final" },
                    { value: "date", label: "Definir data" },
                  ]}
                />
                {expires === "date" ? (
                  <Input
                    aria-label="Data e hora de término"
                    type="datetime-local"
                    className="h-9 w-auto"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                ) : null}
              </div>
            </div>
            <Button type="button" disabled={pending} onClick={handleCreate}>
              {pending ? "Salvando..." : "Publicar aviso"}
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-5" aria-label="Pré-visualização">
          <div>
            <h2 className="font-display text-[15px] font-semibold">Como vai aparecer</h2>
            <p className="text-xs text-muted-foreground">Nos Avisos e no pop-up</p>
          </div>
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            <AvisoItem
              item={{
                id: "preview",
                title: previewTitle,
                message: previewMessage,
                kind: previewKind,
                isBirthday: false,
                meta: `${KIND_LABEL[kind]} · agora`,
              }}
            />
          </ul>
          <AlertCard
            kind={kind === AnnouncementKind.URGENT ? "urgent" : kind === AnnouncementKind.CELEBRATION ? "celebration" : "info"}
            title={previewTitle}
            message={previewMessage}
            actions={
              kind === AnnouncementKind.URGENT
                ? [
                    { label: "Entendi", primary: true, onClick: () => {} },
                    { label: "Ver aviso", onClick: () => {} },
                  ]
                : undefined
            }
            onClose={() => {}}
          />
        </section>
      </div>

      <section className="space-y-2.5 rounded-xl border border-border/80 bg-card p-5 shadow-xs">
        <h2 className="font-display text-[15px] font-semibold">Avisos publicados</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const status = announcementStatus(item);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {KIND_LABEL[item.kind]} · {formatWhen(item.startsAt)}
                      {item.endsAt ? ` até ${formatWhen(item.endsAt)}` : ", sem data final"}
                      {" · "}
                      {item.authorName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[status])}>
                      {status}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleToggle(item.id, !item.active)}
                    >
                      {item.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleDelete(item.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
