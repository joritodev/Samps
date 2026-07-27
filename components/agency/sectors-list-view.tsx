"use client";

import Link from "next/link";
import { ChevronRight, Layers, UserRound } from "lucide-react";

export type SectorListItem = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  leaderName: string | null;
  openDemands: number;
  memberCount: number;
};

export function SectorsListView({ sectors }: { sectors: SectorListItem[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Setores
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Escolha um setor para abrir o quadro de demandas
        </p>
      </header>

      <div className="p-6">
        {sectors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
            <Layers className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground/80">
              Nenhum setor cadastrado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre setores em Configurações para começar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector) => (
              <Link
                key={sector.id}
                href={`/setores/${sector.slug}`}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-card/90 hover:shadow-md"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"
                  style={
                    sector.color
                      ? {
                          backgroundColor: `${sector.color}22`,
                          color: sector.color,
                        }
                      : undefined
                  }
                >
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {sector.name}
                    </h2>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {sector.openDemands} demanda
                    {sector.openDemands === 1 ? "" : "s"} em aberto
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {sector.leaderName
                        ? `Líder: ${sector.leaderName}`
                        : `${sector.memberCount} membro${sector.memberCount === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
