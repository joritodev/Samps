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
import { addDriveAttachmentAction } from "@/app/actions/attachments";
import { requestAdjustmentAction } from "@/lib/actions/adjustment.actions";
import { DeadlineChangeForm } from "@/components/shared/deadline-change-form";
import {
  DemandDelayHistory,
  type DemandDelayRow,
} from "@/components/shared/demand-delay-history";
import {
  DemandChecklist,
  type ChecklistAssigneeOption,
} from "@/components/board/demand-checklist";
import { completeChecklistItemAction } from "@/app/actions/checklist";
import { toast } from "sonner";
import {
  canCompleteProduction,
  canDemandBriefing,
  canRegisterPublication,
  canRequestAdjustment,
  demandStatusLabel,
} from "@/lib/agency/labels";

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
  isChecklistItem?: boolean;
  parentDemandId?: string | null;
  parentDemand?: { id: string; title: string } | null;
  childDemands?: {
    id: string;
    title: string;
    description?: string | null;
    format?: string | null;
    status: string;
    checklistOrder?: number | null;
    dueDate?: Date | string | null;
    assignee?: { id?: string; name: string } | null;
  }[];
  slidesCount?: number | null;
  screensCount?: number | null;
  durationSeconds?: number | null;
  orientation?: string | null;
  complexityLevel?: number | null;
  client?: { name: string };
  list?: { name: string } | null;
  competence?: { month: number; year: number } | null;
  assignee?: { name: string } | null;
  attachments?: {
    id: string;
    name: string;
    url: string;
    visibleToClient: boolean;
  }[];
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
  canChangeDeadline = false,
  canEditChecklist = false,
  checklistAssignees = [],
  delays = [],
  onOpenDemand,
}: {
  clientId: string;
  card: CardDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canChangeDeadline?: boolean;
  canEditChecklist?: boolean;
  checklistAssignees?: ChecklistAssigneeOption[];
  delays?: DemandDelayRow[];
  onOpenDemand?: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [comment, setComment] = useState("");
  const [visible, setVisible] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState("");
  const [orientation, setOrientation] = useState("");
  const [attachName, setAttachName] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [attachVisible, setAttachVisible] = useState(false);

  if (card && title !== card.title && !open) {
    // reset handled on open
  }

  const locked = !!card?.briefingLockedAt;
  const canBriefing = card
    ? canDemandBriefing(card.status, card.briefingLockedAt)
    : false;
  const canProduce = card ? canCompleteProduction(card.status) : false;
  const canAdjust = card ? canRequestAdjustment(card.status) : false;
  const canPublish = card ? canRegisterPublication(card.status) : false;
  const checklistDone =
    card?.status === "DONE" ||
    card?.status === "PUBLISHED" ||
    card?.status === "DELIVERED";
  const canCompleteChecklistChild =
    !!card?.isChecklistItem &&
    canEditChecklist &&
    !checklistDone;
  const fmt = (card?.format ?? "").toLowerCase();

  useEffect(() => {
    if (card && open) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setMaterialUrl(card.materialUrl ?? "");
      setPublishedUrl(card.publishedUrl ?? "");
      setVisible(card.visibleToClient);
      setDurationSeconds(
        card.durationSeconds != null ? String(card.durationSeconds) : ""
      );
      setOrientation(card.orientation ?? "");
      setAttachName("");
      setAttachUrl("");
      setAttachVisible(false);
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
                <Badge variant="outline">{demandStatusLabel(card.status)}</Badge>
                {card.cardCode && <Badge variant="secondary">{card.cardCode}</Badge>}
                {card.isContractual && <Badge variant="secondary">Contratual</Badge>}
                {card.isChecklistItem && card.parentDemand?.title ? (
                  <Badge variant="secondary">
                    Parte de: {card.parentDemand.title}
                  </Badge>
                ) : null}
              </div>
            </SheetHeader>

            {canCompleteChecklistChild ? (
              <Button
                className="mt-3"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const r = await completeChecklistItemAction({
                      childId: card.id,
                      clientId,
                    });
                    if (!("success" in r) || !r.success) {
                      toast.error(
                        "error" in r
                          ? r.error
                          : "Não foi possível concluir o item."
                      );
                    } else {
                      toast.success("Demanda do checklist concluída.");
                      onOpenChange(false);
                    }
                  });
                }}
              >
                Concluir demanda
              </Button>
            ) : null}

            <Tabs defaultValue="identification" className="mt-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="identification">Identificação</TabsTrigger>
                <TabsTrigger value="planning">Planejamento</TabsTrigger>
                {!card.isChecklistItem ? (
                  <TabsTrigger value="checklist">Checklist</TabsTrigger>
                ) : null}
                <TabsTrigger value="delays">Atrasos</TabsTrigger>
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
                  <Input defaultValue={card.objective ?? ""} disabled={!canBriefing} />
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
                {card.dueDate && (
                  <p className="text-sm">Prazo interno: {format(new Date(card.dueDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
              </TabsContent>

              {!card.isChecklistItem ? (
                <TabsContent value="checklist" className="space-y-3">
                  <DemandChecklist
                    parentId={card.id}
                    clientId={clientId}
                    items={card.childDemands ?? []}
                    assignees={checklistAssignees}
                    canEdit={canEditChecklist}
                    defaultDueDate={card.dueDate}
                    onOpenItem={onOpenDemand}
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="delays" className="space-y-4">
                <DemandDelayHistory delays={delays} />
                {canChangeDeadline && card && (
                  <DeadlineChangeForm
                    demandId={card.id}
                    clientId={clientId}
                    dueDate={card.dueDate}
                    demandDeadline={card.demandDeadline}
                    publishDate={card.publishDate}
                  />
                )}
              </TabsContent>

              <TabsContent value="briefing" className="space-y-3">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canBriefing} />
                </div>
                <div className="space-y-1">
                  <Label>Descrição *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canBriefing}
                    rows={5}
                    placeholder="Descreva o briefing antes de demandar"
                  />
                </div>
                {fmt.includes("carrossel") && (
                  <div className="space-y-1">
                    <Label>Slides</Label>
                    <Input type="number" defaultValue={card.slidesCount ?? ""} disabled={!canBriefing} />
                  </div>
                )}
                {fmt.includes("stor") && (
                  <div className="space-y-1">
                    <Label>Telas</Label>
                    <Input type="number" defaultValue={card.screensCount ?? ""} disabled={!canBriefing} />
                  </div>
                )}
                {(fmt.includes("reel") || fmt.includes("video")) && (
                  <>
                    <div className="space-y-1">
                      <Label>Duração (seg) *</Label>
                      <Input
                        type="number"
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(e.target.value)}
                        disabled={!canBriefing}
                        className="tabular-nums"
                        placeholder="Ex.: 30"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Orientação / formato *</Label>
                      <Input
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value)}
                        disabled={!canBriefing}
                        placeholder="Ex.: 9:16 vertical"
                      />
                    </div>
                  </>
                )}
                {canBriefing && (
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
                        const duration = durationSeconds.trim()
                          ? Number(durationSeconds)
                          : undefined;
                        const r = await demandBriefingAction(card.id, clientId, {
                          title: title.trim(),
                          description: description.trim(),
                          format: card.format ?? "Feed",
                          durationSeconds: Number.isFinite(duration)
                            ? duration
                            : undefined,
                          orientation: orientation.trim() || undefined,
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
                {!canBriefing && (
                  <p className="text-xs text-muted-foreground">
                    {locked && card.briefingLockedAt
                      ? `Briefing bloqueado em ${format(new Date(card.briefingLockedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
                      : `Esta demanda já está em “${demandStatusLabel(card.status)}”. O briefing só pode ser demandado enquanto estiver em planejamento.`}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="production" className="space-y-3">
                <p className="text-sm">Executor: {card.assignee?.name ?? "Não atribuído"}</p>
                {(card.attachments?.length ?? 0) > 0 ? (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Anexos (links Drive — demo)
                    </p>
                    <ul className="space-y-1">
                      {card.attachments!.map((a) => (
                        <li key={a.id} className="truncate text-sm">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {a.name}
                          </a>
                          {a.visibleToClient ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              visível ao cliente
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Adicionar link (demo 3.2 — sem upload de arquivo)
                  </p>
                  <Input
                    value={attachName}
                    onChange={(e) => setAttachName(e.target.value)}
                    placeholder="Nome do arquivo"
                  />
                  <Input
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={attachVisible}
                      onCheckedChange={setAttachVisible}
                    />
                    Visível no portal do cliente
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending || !attachName.trim() || !attachUrl.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await addDriveAttachmentAction({
                          demandId: card.id,
                          clientId,
                          name: attachName,
                          url: attachUrl,
                          visibleToClient: attachVisible,
                        });
                        if (r.error) toast.error(r.error);
                        else {
                          toast.success("Anexo (link) adicionado");
                          setAttachName("");
                          setAttachUrl("");
                          setAttachVisible(false);
                        }
                      })
                    }
                  >
                    Anexar link
                  </Button>
                </div>
                {canProduce ? (
                  <>
                    <div className="space-y-1">
                      <Label>Link do material</Label>
                      <Input value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)} />
                    </div>
                    <Button
                      variant="outline"
                      disabled={pending || !materialUrl.trim()}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await completeProductionAction(card.id, clientId, materialUrl);
                          if (r.success) toast.success("Enviado para revisão");
                        })
                      }
                    >
                      Concluir produção e enviar para revisão
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {card.materialUrl
                      ? `Material: ${card.materialUrl}`
                      : `Produção disponível quando o status for “Em produção” ou “Em ajuste”. Agora: ${demandStatusLabel(card.status)}.`}
                  </p>
                )}
                {canAdjust && (
                  <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
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
                {canPublish ? (
                  <>
                    <div className="space-y-1">
                      <Label>Link de publicação</Label>
                      <Input value={publishedUrl} onChange={(e) => setPublishedUrl(e.target.value)} />
                    </div>
                    <Button
                      disabled={pending || !publishedUrl.trim()}
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
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {card.publishedUrl
                      ? `Publicado: ${card.publishedUrl}`
                      : `Publicação disponível após aprovação/revisão. Status atual: ${demandStatusLabel(card.status)}.`}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="communication" className="space-y-3">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(card.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-muted p-2 text-sm">
                      <p className="font-medium text-xs">{c.user.name}</p>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Comentário… Use @nome para mencionar alguém."
                />
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
                <p className="text-xs text-muted-foreground">
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
