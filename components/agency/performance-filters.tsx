"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PerformancePreset } from "@/lib/agency/performance-period";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = {
  id: string;
  name: string;
};

export type PerformanceFiltersProps = {
  preset: PerformancePreset;
  from: string;
  to: string;
  sectorId?: string;
  clientId?: string;
  isMgmt: boolean;
  sectors: FilterOption[];
  clients: FilterOption[];
};

const ALL = "__all__";

export function PerformanceFilters({
  preset,
  from,
  to,
  sectorId,
  clientId,
  isMgmt,
  sectors,
  clients,
}: PerformanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  function pushQuery(
    updates: Record<string, string | undefined>,
    remove: string[] = [],
  ) {
    const params = new URLSearchParams(currentSearchParams.toString());

    for (const key of remove) params.delete(key);
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function setPreset(value: string) {
    if (value === "custom") {
      pushQuery({ preset: value, from, to });
      return;
    }
    pushQuery({ preset: value }, ["from", "to"]);
  }

  function setDate(key: "from" | "to", value: string) {
    pushQuery({
      preset: "custom",
      from: key === "from" ? value : from,
      to: key === "to" ? value : to,
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Período
          </span>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">De</span>
          <Input
            type="date"
            value={from}
            onChange={(event) => setDate("from", event.target.value)}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Até</span>
          <Input
            type="date"
            value={to}
            onChange={(event) => setDate("to", event.target.value)}
          />
        </label>

        {isMgmt ? (
          <>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Setor
              </span>
              <Select
                value={sectorId ?? ALL}
                onValueChange={(value) =>
                  pushQuery({ sectorId: value === ALL ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os setores</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Cliente
              </span>
              <Select
                value={clientId ?? ALL}
                onValueChange={(value) =>
                  pushQuery({ clientId: value === ALL ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}
