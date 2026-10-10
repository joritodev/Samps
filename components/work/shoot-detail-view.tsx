"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { HistoryList, type HistoryEntry } from "@/components/work/history-list";
import { ShootFormSheet, type ShootFormValues } from "@/components/work/shoot-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEditingDemandAction, changeShootStatusAction } from "@/lib/actions/shoots.actions";
import { SHOOT_STATUS_LABEL, SHOOT_STATUS_TONE, demandStatusLabel } from "@/lib/agency/labels";
import { safeHref } from "@/lib/agency/url";
import { cn } from "@/lib/utils";
import type { ShootStatus } from "@prisma/client";

export type ShootDetailData = {
  id: string;
  title: string;
  status: ShootStatus;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  shootType: string | null;
  notes: string | null;
  ownerName: string | null;
  project: { id: string; title: string } | null;
  participants: string[];
  materialUrl: string | null;
  completedAt: string | null;
  nextStatuses: ShootStatus[];
  demands: { id: string; title: string; status: string; dueDate: string | null; assigneeName: string | null }[];
  history: HistoryEntry[];
  form: ShootFormValues;
};

const STEPS: ShootStatus[] = ["PLANNED", "SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

const ACTION_LABEL: Record<ShootStatus, string> = {
  PLANNED: "Reabrir como planejada",
  SCHEDULED: "Agendar e avisar a equipe",
  CONFIRMED: "Marcar como confirmada",
  IN_PROGRESS: "Iniciar gravação",
  COMPLETED: "Concluir captação",
  CANCELLED: "Cancelar captação",
};

function fmt(date: string | null) {
  return date ? new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}

export function ShootDetailView({
  data,
  canWrite,
  canCreateDemand,
  users,
  projects,
  currentUserId,
}: {
  data: ShootDetailData;
  canWrite: boolean;
  canCreateDemand: boolean;
  users: { id: string; name: string }[];
  projects: { id: string; title: string; clientId: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [materialUrl, setMaterialUrl] = useState("");

  const cancelled = data.status === "CANCELLED";
  const stepIndex = STEPS.indexOf(data.status);

  function change(status: ShootStatus, url?: string) {
    startTransition(async () => {
      const result = await changeShootStatusAction(data.id, status, url);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Captação atualizada.");
      setCompleteOpen(false);
      router.refresh();
    });
  }

  function addEditing() {
    startTransition(async () => {
      const result = await addEditingDemandAction(data.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Demanda de edição criada.");
      router.refresh();
    });
  }

  const href = safeHref(data.materialUrl);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Link href="/captacoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Captações
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{data.title}</h1>
                <Badge variant={SHOOT_STATUS_TONE[data.status]}>{SHOOT_STATUS_LABEL[data.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.clientName} · {fmt(data.date)}
                {data.startTime ? ` · ${data.startTime}${data.endTime ? ` - ${data.endTime}` : ""}` : ""}
                {data.location ? ` · ${data.location}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Resp.: {data.ownerName ?? "—"}
                {data.participants.length ? ` · Equipe: ${data.participants.join(", ")}` : ""}
                {data.shootType ? ` · ${data.shootType}` : ""}
              </p>
              {data.project ? (
                <p className="text-sm">
                  Projeto:{" "}
                  <Link href={`/projetos/${data.project.id}`} className="font-medium text-primary hover:underline">
                    {data.project.title}
                  </Link>
                </p>
              ) : null}
            </div>
            {canWrite && data.status !== "COMPLETED" && !cancelled ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Editar
              </Button>
            ) : null}
          </div>

          {!cancelled ? (
            <ol className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-xs" aria-label="Etapas da captação">
              {STEPS.map((step, i) => {
                const done = i < stepIndex || data.status === "COMPLETED";
                const current = i === stepIndex && data.status !== "COMPLETED";
                return (
                  <li key={step} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium",
                        done && "bg-success text-success-foreground",
                        current && "bg-primary text-primary-foreground",
                        !done && !current && "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={cn(current ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {SHOOT_STATUS_LABEL[step]}
                    </span>
                    {i < STEPS.length - 1 ? <span className="mx-1 text-border">/</span> : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {canWrite && data.nextStatuses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.nextStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "CANCELLED" ? "outline" : s === "COMPLETED" ? "default" : "secondary"}
                  disabled={pending}
                  onClick={() => (s === "COMPLETED" ? setCompleteOpen(true) : change(s))}
                >
                  {ACTION_LABEL[s]}
                </Button>
              ))}
            </div>
          ) : null}

          {data.status === "COMPLETED" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm">
              <span className="font-medium text-success-ink dark:text-green-300">Concluída em {fmt(data.completedAt)}.</span>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Abrir material <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
          {data.notes ? <p className="max-w-2xl text-sm text-foreground/80">{data.notes}</p> : null}
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Demandas de edição</h2>
            {canWrite && canCreateDemand && !cancelled ? (
              <Button size="sm" onClick={addEditing} disabled={pending}>
                <Plus className="mr-1.5 h-4 w-4" /> Criar demanda de edição
              </Button>
            ) : null}
          </div>
          {data.demands.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma demanda ligada. A edição ganha prazo de 5 dias úteis depois da gravação.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.demands.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={`/demandas?abrir=${d.id}`} className="font-medium hover:text-primary hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {d.assigneeName ?? "Sem responsável"} · prazo {fmt(d.dueDate)}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-normal">{demandStatusLabel(d.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
          <HistoryList entries={data.history} />
        </section>
      </div>

      {canWrite ? (
        <ShootFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          clients={[{ id: data.clientId, name: data.clientName }]}
          users={users}
          projects={projects}
          initial={data.form}
          currentUserId={currentUserId}
          canCreateDemand={canCreateDemand}
        />
      ) : null}

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir captação</DialogTitle>
            <DialogDescription>
              Informe o link do material bruto (Drive). O editor é avisado e a demanda de edição passa a apontar para ele.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="shoot-material">Link do material</Label>
            <Input
              id="shoot-material"
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
              inputMode="url"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button disabled={pending || !materialUrl.trim()} onClick={() => change("COMPLETED", materialUrl)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
