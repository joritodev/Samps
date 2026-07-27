"use client";

import { useState, useTransition, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  demandBriefingAction,
  completeProductionAction,
  registerPublicationAction,
  updateVisibilityAction,
  addCommentAction,
} from "@/lib/actions/cards.actions";
import { requestAdjustmentAction } from "@/lib/actions/adjustment.actions";
import { toast } from "sonner";

type CardDetail = {
  id: string;
  title: string;
  description?: string | null;
  format?: string | null;
  status: string;
  internalStatus?: string | null;
  externalStatus?: string | null;
  cardCode?: string | null;
  objective?: string | null;
  publishDate?: Date | null;
  dueDate?: Date | null;
  demandDeadline?: Date | null;
  materialUrl?: string | null;
  publishedUrl?: string | null;
  publishedAt?: Date | null;
  briefingLockedAt?: Date | null;
  visibleToClient: boolean;
  isContractual: boolean;
  slidesCount?: number | null;
  screensCount?: number | null;
  durationSeconds?: number | null;
  complexityLevel?: number | null;
  client?: { name: string };
  list?: { name: string } | null;
  competence?: { month: number; year: number } | null;
  assignee?: { name: string } | null;
  comments?: {
    id: string;
    text: string;
    commentType: string;
    createdAt: Date;
    user: { name: string };
  }[];
};

export function CardDetailSheet({
  clientId,
  card,
  open,
  onOpenChange,
}: {
  clientId: string;
  card: CardDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [comment, setComment] = useState("");
  const [visible, setVisible] = useState(false);

  if (card && title !== card.title && !open) {
    // reset handled on open
  }

  const locked = !!card?.briefingLockedAt;
  const fmt = (card?.format ?? "").toLowerCase();

  useEffect(() => {
    if (card && open) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setMaterialUrl(card.materialUrl ?? "");
      setPublishedUrl(card.publishedUrl ?? "");
      setVisible(card.visibleToClient);
    }
  }, [card, open]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {card ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-left pr-8">{card.title}</SheetTitle>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{card.status}</Badge>
                {card.cardCode && <Badge variant="secondary">{card.cardCode}</Badge>}
                {card.isContractual && <Badge variant="secondary">Contratual</Badge>}
              </div>
            </SheetHeader>

            <Tabs defaultValue="identification" className="mt-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="identification">Identificação</TabsTrigger>
                <TabsTrigger value="planning">Planejamento</TabsTrigger>
                <TabsTrigger value="briefing">Briefing</TabsTrigger>
                <TabsTrigger value="production">Produção</TabsTrigger>
                <TabsTrigger value="publication">Publicação</TabsTrigger>
                <TabsTrigger value="communication">Comunicação</TabsTrigger>
                <TabsTrigger value="visibility">Visibilidade</TabsTrigger>
              </TabsList>

              <TabsContent value="identification" className="space-y-2 text-sm">
                <p><strong>Cliente:</strong> {card.client?.name}</p>
                <p><strong>Lista:</strong> {card.list?.name}</p>
                {card.competence && (
                  <p><strong>Competência:</strong> {card.competence.month}/{card.competence.year}</p>
                )}
                <p><strong>Status interno:</strong> {card.internalStatus ?? "—"}</p>
                <p><strong>Status externo:</strong> {card.externalStatus ?? "—"}</p>
              </TabsContent>

              <TabsContent value="planning" className="space-y-3">
                <div className="space-y-1">
                  <Label>Objetivo</Label>
                  <Input defaultValue={card.objective ?? ""} disabled={locked} />
                </div>
                <div className="space-y-1">
                  <Label>Formato</Label>
                  <Input value={card.format ?? ""} disabled />
                </div>
                {card.publishDate && (
                  <p className="text-sm">Publicação prevista: {format(new Date(card.publishDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
                {card.demandDeadline && (
                  <p className="text-sm">Prazo demanda: {format(new Date(card.demandDeadline), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
              </TabsContent>

              <TabsContent value="briefing" className="space-y-3">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} />
                </div>
                <div className="space-y-1">
                  <Label>Descrição *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={locked}
                    rows={5}
                    placeholder="Descreva o briefing antes de demandar"
                  />
                </div>
                {fmt.includes("carrossel") && (
                  <div className="space-y-1">
                    <Label>Slides</Label>
                    <Input type="number" defaultValue={card.slidesCount ?? ""} disabled={locked} />
                  </div>
                )}
                {fmt.includes("stor") && (
                  <div className="space-y-1">
                    <Label>Telas</Label>
                    <Input type="number" defaultValue={card.screensCount ?? ""} disabled={locked} />
                  </div>
                )}
                {(fmt.includes("reel") || fmt.includes("video")) && (
                  <div className="space-y-1">
                    <Label>Duração (seg)</Label>
                    <Input type="number" defaultValue={card.durationSeconds ?? ""} disabled={locked} />
                  </div>
                )}
                {!locked && (
                  <Button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        if (!title.trim()) {
                          toast.error("Informe o título do briefing");
                          return;
                        }
                        if (!description.trim()) {
                          toast.error("Informe a descrição do briefing");
                          return;
                        }
                        const r = await demandBriefingAction(card.id, clientId, {
                          title: title.trim(),
                          description: description.trim(),
                          format: card.format ?? "Feed",
                        });
                        if ("success" in r && r.success) {
                          toast.success("Briefing demandado");
                        } else if ("error" in r && r.error) {
                          toast.error(r.error);
                        } else {
                          toast.error("Erro ao demandar");
                        }
                      })
                    }
                  >
                    Concluir briefing e demandar
                  </Button>
                )}
                {locked && (
                  <p className="text-xs text-amber-600">Briefing bloqueado em {format(new Date(card.briefingLockedAt!), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
              </TabsContent>

              <TabsContent value="production" className="space-y-3">
                <p className="text-sm">Executor: {card.assignee?.name ?? "Não atribuído"}</p>
                <div className="space-y-1">
                  <Label>Link do material</Label>
                  <Input value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await completeProductionAction(card.id, clientId, materialUrl);
                      if (r.success) toast.success("Enviado para revisão");
                    })
                  }
                >
                  Concluir produção e enviar para revisão
                </Button>
                {(card.status === "IN_REVIEW" || card.status === "ADJUSTMENTS") && (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <Label>Solicitar ajuste</Label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Descreva o ajuste"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending || !comment.trim()}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await requestAdjustmentAction(
                            card.id,
                            clientId,
                            comment
                          );
                          if (r.error) toast.error(r.error);
                          else {
                            toast.success("Ajuste solicitado");
                            setComment("");
                          }
                        })
                      }
                    >
                      Solicitar ajuste
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="publication" className="space-y-3">
                <div className="space-y-1">
                  <Label>Link de publicação</Label>
                  <Input value={publishedUrl} onChange={(e) => setPublishedUrl(e.target.value)} />
                </div>
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await registerPublicationAction(card.id, clientId, {
                        publishedUrl,
                      });
                      if (r.success) toast.success("Publicação registrada");
                    })
                  }
                >
                  Registrar publicação e concluir
                </Button>
              </TabsContent>

              <TabsContent value="communication" className="space-y-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(card.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                      <p className="font-medium text-xs">{c.user.name}</p>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || !comment.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      await addCommentAction(card.id, clientId, comment);
                      setComment("");
                      toast.success("Comentário adicionado");
                    })
                  }
                >
                  Comentar
                </Button>
              </TabsContent>

              <TabsContent value="visibility" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Visível ao cliente</Label>
                  <Switch
                    checked={visible}
                    onCheckedChange={(v) => {
                      setVisible(v);
                      startTransition(async () => {
                        await updateVisibilityAction(card.id, clientId, v);
                      });
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Campos visíveis configuráveis na aba de configurações do portal.
                </p>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
