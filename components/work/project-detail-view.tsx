"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, Pencil, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";
import { NewDemandSheet } from "@/components/agency/new-demand-sheet";
import { HistoryList, type HistoryEntry } from "@/components/work/history-list";
import { ProjectFormSheet, type ProjectFormValues } from "@/components/work/project-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  changeProjectStatusAction,
  linkDemandToProjectAction,
  listLinkableDemandsAction,
} from "@/lib/actions/projects.actions";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, SHOOT_STATUS_LABEL, SHOOT_STATUS_TONE, demandStatusLabel } from "@/lib/agency/labels";
import type { ProjectStatus, ShootStatus } from "@prisma/client";
import type { TaxonomyOption } from "@/types/board-ui";

export type ProjectDetailData = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  outsideContract: boolean;
  clientId: string;
  clientName: string;
  ownerName: string | null;
  startDate: string | null;
  dueDate: string | null;
  participants: string[];
  progress: { total: number; done: number; open: number; percent: number };
  suggestion: { next: ProjectStatus; reason: string } | null;
  allowedStatuses: ProjectStatus[];
  demands: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    assigneeName: string | null;
    sectorName: string | null;
  }[];
  shoots: { id: string; title: string; date: string; status: ShootStatus }[];
  history: HistoryEntry[];
  form: ProjectFormValues;
};

const STATUS_BUTTON: Record<ProjectStatus, string> = {
  PLANNING: "Voltar para planejamento",
  ACTIVE: "Iniciar / retomar",
  ON_HOLD: "Pausar",
  COMPLETED: "Concluir projeto",
  CANCELLED: "Cancelar projeto",
};

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}

export function ProjectDetailView({
  data,
  canWrite,
  isManagement,
  users,
  sectors,
  priorities,
  currentUserId,
  canCreateDemand,
}: {
  data: ProjectDetailData;
  canWrite: boolean;
  isManagement: boolean;
  users: { id: string; name: string }[];
  sectors: TaxonomyOption[];
  priorities: TaxonomyOption[];
  currentUserId: string;
  canCreateDemand: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkable, setLinkable] = useState<{ id: string; title: string; status: string }[] | null>(null);

  const closed = data.status === "COMPLETED" || data.status === "CANCELLED";

  function changeStatus(status: ProjectStatus) {
    startTransition(async () => {
      const result = await changeProjectStatusAction(data.id, status);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Status atualizado.");
      router.refresh();
    });
  }

  function openLinkDialog() {
    setLinkOpen(true);
    setLinkable(null);
    void listLinkableDemandsAction(data.id).then(setLinkable);
  }

  function link(demandId: string, projectId: string | null) {
    startTransition(async () => {
      const result = await linkDemandToProjectAction(demandId, projectId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(projectId ? "Demanda ligada ao projeto." : "Demanda removida do projeto.");
      setLinkOpen(false);
      router.refresh();
    });
  }

  const actions = data.allowedStatuses.filter((s) => isManagement || (s !== "COMPLETED" && s !== "CANCELLED"));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Projetos
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{data.title}</h1>
                <Badge variant={PROJECT_STATUS_TONE[data.status]}>{PROJECT_STATUS_LABEL[data.status]}</Badge>
                {data.outsideContract ? <Badge variant="warning">Fora do contrato</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.clientName} · Resp.: {data.ownerName ?? "—"} · {fmt(data.startDate)} a {fmt(data.dueDate)}
              </p>
              {data.description ? <p className="max-w-2xl text-sm text-foreground/80">{data.description}</p> : null}
            </div>
            {canWrite ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar
              </Button>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progresso</span>
              <span className="tabular-nums text-muted-foreground">
                {data.progress.total > 0
                  ? `${data.progress.done} de ${data.progress.total} demandas entregues (${data.progress.percent}%)`
                  : "Nenhuma demanda ligada ainda"}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={data.progress.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data.progress.percent}%` }} />
            </div>
            {data.suggestion && canWrite && (data.suggestion.next !== "COMPLETED" || isManagement) ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                <span className="text-foreground">{data.suggestion.reason}</span>
                <Button size="sm" disabled={pending} onClick={() => changeStatus(data.suggestion!.next)}>
                  {STATUS_BUTTON[data.suggestion.next]}
                </Button>
              </div>
            ) : null}
          </div>

          {canWrite && actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((s) => (
                <Button key={s} size="sm" variant={s === "CANCELLED" ? "outline" : "secondary"} disabled={pending} onClick={() => changeStatus(s)}>
                  {STATUS_BUTTON[s]}
                </Button>
              ))}
            </div>
          ) : null}
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Demandas do projeto</h2>
            {canWrite && !closed ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openLinkDialog}>
                  <Link2 className="mr-1.5 h-4 w-4" /> Ligar demanda existente
                </Button>
                {canCreateDemand ? (
                  <Button size="sm" onClick={() => setDemandOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> Nova demanda
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {data.demands.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Ainda sem demandas. Crie uma nova ou ligue uma que já existe para este cliente.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Demanda</th>
                    <th className="px-4 py-2.5 font-medium">Responsável</th>
                    <th className="px-4 py-2.5 font-medium">Prazo</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {data.demands.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/demandas?abrir=${d.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                          {d.title}
                        </Link>
                        {d.sectorName ? <p className="text-xs text-muted-foreground">{d.sectorName}</p> : null}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.assigneeName ?? "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{fmt(d.dueDate)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="font-normal">{demandStatusLabel(d.status)}</Badge>
                      </td>
                      <td className="px-2">
                        {canWrite && !closed ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Tirar "${d.title}" do projeto`}
                            title="Tirar do projeto"
                            disabled={pending}
                            onClick={() => link(d.id, null)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Captações</h2>
            {data.shoots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma captação neste projeto.</p>
            ) : (
              <ul className="space-y-2">
                {data.shoots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <Link href={`/captacoes/${s.id}`} className="font-medium hover:text-primary hover:underline">
                      {s.title}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {fmt(s.date)}
                      <Badge variant={SHOOT_STATUS_TONE[s.status]}>{SHOOT_STATUS_LABEL[s.status]}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="pt-2 text-lg font-semibold text-foreground">Equipe</h2>
            <p className="text-sm text-muted-foreground">
              {data.participants.length ? data.participants.join(", ") : "Sem participantes além do responsável."}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
            <HistoryList entries={data.history} />
          </section>
        </div>
      </div>

      {canWrite ? (
        <ProjectFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          clients={[{ id: data.clientId, name: data.clientName }]}
          users={users}
          initial={data.form}
          currentUserId={currentUserId}
        />
      ) : null}

      {canCreateDemand ? (
        <NewDemandSheet
          open={demandOpen}
          onOpenChange={setDemandOpen}
          clients={[{ id: data.clientId, name: data.clientName }]}
          sectors={sectors}
          priorities={priorities}
          projects={[{ id: data.id, title: data.title, clientId: data.clientId }]}
          defaultProjectId={data.id}
        />
      ) : null}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ligar demanda existente</DialogTitle>
            <DialogDescription>Demandas abertas de {data.clientName} que ainda não estão em nenhum projeto.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {linkable === null ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : linkable.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma demanda livre para ligar.</p>
            ) : (
              linkable.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{demandStatusLabel(d.status)}</p>
                  </div>
                  <Button size="sm" disabled={pending} onClick={() => link(d.id, data.id)}>
                    Ligar
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
