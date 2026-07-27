"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  LogOut,
  Package,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  ClientPortalMaterial,
  ClientPortalOverview,
  ClientPortalStatus,
} from "@/types/portal-ui";

const statusLabel: Record<ClientPortalStatus, string> = {
  IN_PRODUCTION: "Em produção",
  AWAITING_APPROVAL: "Aguardando sua aprovação",
  PUBLISHED: "Publicado",
};

const statusClass: Record<ClientPortalStatus, string> = {
  IN_PRODUCTION: "border-slate-200 bg-slate-50 text-slate-600",
  AWAITING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-800",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function formatScheduledDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MaterialCard({ material }: { material: ClientPortalMaterial }) {
  const showMaterial =
    material.status === "AWAITING_APPROVAL" || material.status === "PUBLISHED";

  return (
    <Card className="border-slate-200/80 bg-white shadow-none">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
            {material.title}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 font-normal",
              statusClass[material.status]
            )}
          >
            {statusLabel[material.status]}
          </Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {material.format}
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Data prevista {formatScheduledDate(material.scheduledDate)}
          </span>
        </CardDescription>
      </CardHeader>
      {showMaterial ? (
        <CardContent className="pt-0">
          <Button variant="outline" size="sm" asChild>
            <a
              href={material.materialUrl ?? "#"}
              target={material.materialUrl ? "_blank" : undefined}
              rel={material.materialUrl ? "noopener noreferrer" : undefined}
            >
              Ver Material
            </a>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

export function ClientPortalView({ data }: { data: ClientPortalOverview }) {
  const upcoming = data.materials.filter((m) => m.status !== "PUBLISHED");
  const completed = data.materials.filter(
    (m) => m.status === "PUBLISHED" || m.status === "AWAITING_APPROVAL"
  );
  const recent = data.materials.slice(0, 3);

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
              {data.clientName
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {data.clientName}
              </h1>
              <p className="text-sm text-slate-500">{data.competenceLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0 text-slate-500 hover:text-slate-800"
          >
            <Link href="/login">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-slate-100 bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-slate-500 shadow-none data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-slate-500 shadow-none data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
            >
              Próximas Publicações
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-slate-500 shadow-none data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
            >
              Materiais Concluídos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-8">
            <section className="grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-200/80 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Conteúdos Previstos
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {data.stats.planned}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Em Produção
                  </CardTitle>
                  <Package className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {data.stats.inProduction}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Publicados
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {data.stats.published}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Materiais Recentes
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Acompanhe as entregas da competência atual
                </p>
              </div>
              {recent.length ? (
                <div className="grid gap-3">
                  {recent.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              ) : (
                <EmptyState message="Nenhum material nesta competência ainda." />
              )}
            </section>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-0 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Próximas Publicações
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Conteúdos planejados e em andamento
              </p>
            </div>
            {upcoming.length ? (
              <div className="grid gap-3">
                {upcoming.map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <EmptyState message="Não há publicações pendentes." />
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Materiais Concluídos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Entregas disponíveis para visualização
              </p>
            </div>
            {completed.length ? (
              <div className="grid gap-3">
                {completed.map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <EmptyState message="Nenhum material concluído ainda." />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
