import { auditActionLabel } from "@/lib/agency/audit-labels";
import type { AuditAction } from "@prisma/client";

export type HistoryEntry = {
  id: string;
  action: AuditAction;
  createdAt: string;
  userName: string | null;
  description: string | null;
};

/** Linha do tempo simples de quem mexeu e o quê. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>;
  }
  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="border-l-2 border-border pl-3 text-sm">
          <p className="font-medium text-foreground">{e.description ?? auditActionLabel(e.action)}</p>
          <p className="text-xs text-muted-foreground">
            {e.userName ?? "Sistema"} · {new Date(e.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function toHistoryEntries(
  rows: { id: string; action: AuditAction; createdAt: Date; user: { name: string } | null; newValue: unknown }[]
): HistoryEntry[] {
  return rows.map((r) => {
    const value = r.newValue as { description?: unknown; title?: unknown } | null;
    const description = typeof value?.description === "string" ? value.description : null;
    return {
      id: r.id,
      action: r.action,
      createdAt: r.createdAt.toISOString(),
      userName: r.user?.name ?? null,
      description,
    };
  });
}
