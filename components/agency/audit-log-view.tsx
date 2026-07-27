"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuditAction } from "@prisma/client";
import { ChevronDown, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AUDIT_ACTION_LABEL,
  auditActionLabel,
  entityTypeLabel,
} from "@/lib/agency/audit-labels";
import { cn } from "@/lib/utils";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  userName: string;
  previousValue: unknown;
  newValue: unknown;
};

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o período" },
];

const ALL = "__all__";

function formatMoment(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DiffCell({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = Boolean(entry.previousValue || entry.newValue);

  if (!hasDetail) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
        />
        {expanded ? "Ocultar" : "Ver alteração"}
      </button>
      {expanded ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/80 p-2 text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(entry.previousValue ?? {}, null, 2)}
          </pre>
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/80 p-2 text-[11px] leading-relaxed text-foreground/80">
            {JSON.stringify(entry.newValue ?? {}, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function AuditLogView({
  logs,
  actors,
  filters,
}: {
  logs: AuditLogEntry[];
  actors: { id: string; name: string }[];
  filters: { action: string; user: string; period: string };
}) {
  const router = useRouter();

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => Boolean(v))
    );
    if (!value || value === ALL) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.replace(`/historico?${next.toString()}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <History className="h-4 w-4 text-foreground/80" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Histórico
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Registro imutável de quem fez o quê, e quando
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.action || ALL}
            onValueChange={(v) => setFilter("action", v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as ações</SelectItem>
              {Object.entries(AUDIT_ACTION_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.user || ALL}
            onValueChange={(v) => setFilter("user", v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos os autores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os autores</SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor.id} value={actor.id}>
                  {actor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.period}
            onValueChange={(v) => setFilter("period", v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground/80">
              Nenhum registro no período
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste os filtros para ver outras ações.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Quando</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead className="pr-6">Alteração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="align-top">
                    <TableCell className="whitespace-nowrap pl-6 text-sm tabular-nums text-muted-foreground">
                      {formatMoment(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {auditActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entityTypeLabel(log.entityType)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <DiffCell entry={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
