"use client";

import Link from "next/link";
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
  CONTRACT_PERIODICITIES,
  type ContentTypeOption,
  type ContractPeriodicity,
} from "@/lib/agency/contract-services";

export type ScopeFieldRow = {
  contentTypeId: string;
  quantity: string;
  periodicity: ContractPeriodicity;
};

export function buildScopeRows(
  contentTypes: ContentTypeOption[],
  existing?: {
    contentTypeId?: string | null;
    name: string;
    quantity: number | null;
    periodicity: string;
  }[]
): ScopeFieldRow[] {
  const byId = new Map(
    (existing ?? [])
      .filter((e) => e.contentTypeId)
      .map((e) => [e.contentTypeId!, e])
  );
  const byName = new Map((existing ?? []).map((e) => [e.name, e]));

  return contentTypes.map((ct) => {
    const match = byId.get(ct.id) ?? byName.get(ct.name);
    const periodicity =
      match &&
      CONTRACT_PERIODICITIES.some((p) => p.value === match.periodicity)
        ? (match.periodicity as ContractPeriodicity)
        : "monthly";
    return {
      contentTypeId: ct.id,
      quantity:
        match?.quantity != null && match.quantity > 0
          ? String(match.quantity)
          : "",
      periodicity,
    };
  });
}

export function ContractScopeFields({
  contentTypes,
  rows,
  onChange,
  notes,
  onNotesChange,
  showNotes = true,
}: {
  contentTypes: ContentTypeOption[];
  rows: ScopeFieldRow[];
  onChange: (rows: ScopeFieldRow[]) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  showNotes?: boolean;
}) {
  function updateRow(index: number, patch: Partial<ScopeFieldRow>) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Escopo do contrato</Label>
        {contentTypes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            Nenhum tipo de conteúdo cadastrado.{" "}
            <Link
              href="/configuracoes/tipos"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Configurações → Tipos
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, index) => {
              const ct = contentTypes[index];
              if (!ct) return null;
              return (
                <li
                  key={ct.id}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_7.5rem]"
                >
                  <span className="truncate text-sm text-foreground">
                    {ct.name}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(index, { quantity: e.target.value })
                    }
                    className="h-9"
                    aria-label={`Quantidade de ${ct.name}`}
                  />
                  <Select
                    value={row.periodicity}
                    onValueChange={(v) =>
                      updateRow(index, {
                        periodicity: v as ContractPeriodicity,
                      })
                    }
                  >
                    <SelectTrigger className="h-9" aria-label={`Periodicidade de ${ct.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_PERIODICITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showNotes && onNotesChange ? (
        <div className="space-y-2">
          <Label htmlFor="contract-notes">Observações</Label>
          <textarea
            id="contract-notes"
            value={notes ?? ""}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notas opcionais do contrato…"
            className="flex min-h-[80px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      ) : null}
    </div>
  );
}

export function scopeRowsToPayload(rows: ScopeFieldRow[]) {
  return rows.map((r) => ({
    contentTypeId: r.contentTypeId,
    quantity: r.quantity === "" ? 0 : Number(r.quantity),
    periodicity: r.periodicity,
  }));
}
