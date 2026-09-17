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
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

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

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function resetForm() {
    setTitle("");
    setMessage("");
    setKind(AnnouncementKind.INFO);
    setStartsAt("");
    setEndsAt("");
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAnnouncement({
        title,
        message,
        kind,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (startsAt && new Date(startsAt) > new Date()) {
        toast.success("Aviso agendado — aparece no mural a partir do início.");
      } else {
        toast.success("Aviso publicado no mural");
      }
      resetForm();
      router.refresh();
      setItems((prev) => [
        {
          id: result.id!,
          title: title.trim(),
          message: message.trim(),
          kind,
          startsAt: startsAt
            ? new Date(startsAt).toISOString()
            : new Date().toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
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

  return (
    <div className="space-y-8 p-6">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Novo aviso</h2>
          <p className="text-sm text-muted-foreground">
            Avisos gerais aparecem no megafone da área interna enquanto
            estiverem ativos. Deixe o início vazio para publicar agora; se
            preencher um horário futuro, só aparece a partir dele.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="aviso-title">Título</Label>
            <Input
              id="aviso-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião geral às 16h"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="aviso-message">Mensagem</Label>
            <Textarea
              id="aviso-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as AnnouncementKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AnnouncementKind.INFO}>Informativo</SelectItem>
                <SelectItem value={AnnouncementKind.URGENT}>Urgente</SelectItem>
                <SelectItem value={AnnouncementKind.CELEBRATION}>
                  Celebração
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              className={
                kind === AnnouncementKind.URGENT
                  ? "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
                  : kind === AnnouncementKind.CELEBRATION
                    ? "rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs text-fuchsia-950 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-100"
                    : "rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              }
            >
              {kind === AnnouncementKind.URGENT
                ? "Preview: destaque no mural; não é um erro do sistema."
                : kind === AnnouncementKind.CELEBRATION
                  ? "Preview: aviso de celebração no mural e no pop-up."
                  : "Preview: informativo no megafone e no pop-up. Urgente usa destaque no mural; não é um erro do sistema."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aviso-starts">Publicar agora ou agendar</Label>
            <Input
              id="aviso-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Vazio = publicar agora. Preenchido = agendar.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aviso-ends">Some do mural depois desta data</Label>
            <Input
              id="aviso-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" disabled={pending} onClick={handleCreate}>
          {pending ? "Salvando..." : "Publicar aviso"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Avisos</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(item.startsAt)}
                    {item.endsAt ? ` → ${formatWhen(item.endsAt)}` : " → sem fim"}
                    {" · "}
                    {item.authorName}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
