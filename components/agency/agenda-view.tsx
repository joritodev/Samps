"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AGENDA_KIND_LABEL,
  type AgendaEvent,
  type AgendaEventKind,
} from "@/lib/agency/agenda-events";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const KIND_CHIP: Record<AgendaEventKind, string> = {
  due: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
  delivery:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200",
  publish: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200",
  birthday:
    "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-400/15 dark:text-fuchsia-200",
  absence:
    "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200",
};

const KIND_CARD: Record<AgendaEventKind, string> = {
  due: "border-amber-200/70 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-400/10",
  delivery:
    "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-400/10",
  publish:
    "border-sky-200/70 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-400/10",
  birthday:
    "border-fuchsia-200/70 bg-fuchsia-50/70 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/10",
  absence:
    "border-rose-200/70 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-400/10",
};

const KIND_BADGE: Record<AgendaEventKind, string> = {
  due: "border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-200",
  delivery:
    "border-emerald-200 bg-emerald-100/80 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-200",
  publish:
    "border-sky-200 bg-sky-100/80 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-200",
  birthday:
    "border-fuchsia-200 bg-fuchsia-100/80 text-fuchsia-900 dark:border-fuchsia-400/40 dark:bg-fuchsia-400/15 dark:text-fuchsia-200",
  absence:
    "border-rose-200 bg-rose-100/80 text-rose-900 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-200",
};

const KIND_OPTIONS: AgendaEventKind[] = [
  "due",
  "delivery",
  "publish",
  "birthday",
  "absence",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function eventDayParts(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    time: d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function eventHref(event: AgendaEvent) {
  if (event.kind === "birthday") {
    if (event.clientId) return `/clientes/${event.clientId}`;
    return "/equipe";
  }
  if (event.kind === "absence") return "/equipe";
  if (event.demandId && event.clientId) {
    return `/clientes/${event.clientId}/quadro`;
  }
  if (event.clientId) return `/clientes/${event.clientId}/quadro`;
  return "/demandas";
}

export function AgendaView({ events }: { events: AgendaEvent[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const sectorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of events) {
      const key = e.sectorId ?? e.sectorSlug ?? "__none__";
      const label = e.sectorName ?? "Sem setor";
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [events]);

  const [enabledKinds, setEnabledKinds] = useState<
    Record<AgendaEventKind, boolean>
  >(() => ({
    due: true,
    delivery: true,
    publish: true,
    birthday: true,
    absence: true,
  }));
  const [enabledSectors, setEnabledSectors] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sectorOptions.map((s) => [s.id, true]))
  );

  useEffect(() => {
    setEnabledSectors((prev) => {
      const next = { ...prev };
      for (const s of sectorOptions) {
        if (next[s.id] === undefined) next[s.id] = true;
      }
      return next;
    });
  }, [sectorOptions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const total = daysInMonth(year, month);
    const offset = startWeekday(year, month);
    const items: Array<{ day: number | null; key: string }> = [];

    for (let i = 0; i < offset; i++) {
      items.push({ day: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= total; d++) {
      items.push({ day: d, key: `day-${d}` });
    }
    while (items.length % 7 !== 0) {
      items.push({ day: null, key: `end-${items.length}` });
    }
    return items;
  }, [year, month]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!enabledKinds[event.kind]) return false;
      const sectorKey = event.sectorId ?? event.sectorSlug ?? "__none__";
      if (enabledSectors[sectorKey] === false) return false;
      return true;
    });
  }, [events, enabledKinds, enabledSectors]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const p = eventDayParts(event.date);
      return p.year === year && p.month === month;
    });
  }, [filteredEvents, year, month]);

  const selectedEvents = useMemo(() => {
    return monthEvents.filter((event) => {
      const p = eventDayParts(event.date);
      return p.day === selectedDay;
    });
  }, [monthEvents, selectedDay]);

  const kpis = useMemo(() => {
    const bySector = new Map<string, { label: string; count: number }>();
    for (const e of monthEvents) {
      const key = e.sectorId ?? e.sectorSlug ?? "__none__";
      const label = e.sectorName ?? "Sem setor";
      const cur = bySector.get(key) ?? { label, count: 0 };
      cur.count += 1;
      bySector.set(key, cur);
    }
    const sectorKpis = Array.from(bySector.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return [
      {
        id: "total",
        label: "Eventos no mês",
        value: monthEvents.length,
        icon: Package,
        className:
          "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-400/30 dark:bg-emerald-400/10",
        iconClass:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200",
      },
      ...sectorKpis.map((s, i) => ({
        id: `sector-${i}`,
        label: s.label,
        value: s.count,
        icon: i === 0 ? Send : CalendarDays,
        className: "border-border bg-card",
        iconClass: "bg-muted text-muted-foreground",
      })),
    ];
  }, [monthEvents]);

  const weekCount = Math.ceil(cells.length / 7);

  const selectedDateLabel = new Date(year, month, selectedDay).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric" }
  );

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      const maxDay = daysInMonth(next.getFullYear(), next.getMonth());
      setSelectedDay((d) => Math.min(d, maxDay));
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Agenda
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Prazos, entregas e publicações das demandas
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <section className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.id}
                className={cn("rounded-2xl shadow-none", kpi.className)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      kpi.iconClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                      {kpi.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <aside className="min-h-0 xl:col-span-2">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tipos
                  </p>
                  {KIND_OPTIONS.map((kind) => (
                    <label
                      key={kind}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={enabledKinds[kind]}
                        onCheckedChange={(checked) =>
                          setEnabledKinds((prev) => ({
                            ...prev,
                            [kind]: checked === true,
                          }))
                        }
                      />
                      {AGENDA_KIND_LABEL[kind]}
                    </label>
                  ))}
                </div>

                {sectorOptions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Setores
                    </p>
                    {sectorOptions.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                      >
                        <Checkbox
                          checked={enabledSectors[s.id] !== false}
                          onCheckedChange={(checked) =>
                            setEnabledSectors((prev) => ({
                              ...prev,
                              [s.id]: checked === true,
                            }))
                          }
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </aside>

          <div className="flex min-h-0 flex-col xl:col-span-7">
            <Card className="flex h-full min-h-0 flex-col rounded-2xl shadow-none">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pb-3 pt-4">
                <CardTitle className="text-base font-semibold capitalize tracking-tight">
                  {monthLabel(year, month)}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label="Próximo mês"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-2 pt-0">
                <div className="grid shrink-0 grid-cols-7 gap-px">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div
                  className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border"
                  style={{
                    gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))`,
                  }}
                >
                  {cells.map((cell) => {
                    const dayEvents = cell.day
                      ? monthEvents.filter((e) => {
                          const p = eventDayParts(e.date);
                          return p.day === cell.day;
                        })
                      : [];
                    const isSelected = cell.day === selectedDay;
                    const isToday =
                      cell.day === today.getDate() &&
                      month === today.getMonth() &&
                      year === today.getFullYear();

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.day}
                        onClick={() => cell.day && setSelectedDay(cell.day)}
                        className={cn(
                          "flex min-h-0 flex-col overflow-hidden bg-card p-1.5 text-left transition-colors",
                          cell.day && "hover:bg-muted",
                          !cell.day && "bg-muted/80",
                          isSelected &&
                            "ring-2 ring-inset ring-emerald-400/70 dark:ring-emerald-400/50",
                          isToday &&
                            !isSelected &&
                            "bg-emerald-50/40 dark:bg-emerald-400/10"
                        )}
                      >
                        {cell.day ? (
                          <>
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-muted-foreground",
                                isToday &&
                                  "bg-emerald-600 text-white dark:bg-emerald-500"
                              )}
                            >
                              {cell.day}
                            </span>
                            <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                              {dayEvents.slice(0, 2).map((event) => {
                                const p = eventDayParts(event.date);
                                return (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                                      KIND_CHIP[event.kind]
                                    )}
                                  >
                                    <span className="block truncate">
                                      {event.title}
                                    </span>
                                    <span className="opacity-80">{p.time}</span>
                                  </div>
                                );
                              })}
                              {dayEvents.length > 2 ? (
                                <p className="px-1 text-[10px] text-muted-foreground">
                                  +{dayEvents.length - 2} mais
                                </p>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="flex min-h-0 flex-col xl:col-span-3">
            <Card className="flex h-full min-h-0 flex-col rounded-2xl shadow-none">
              <CardHeader className="shrink-0 pb-3 pt-4">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Detalhes do dia
                </CardTitle>
                <p className="text-sm text-muted-foreground">{selectedDateLabel}</p>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum evento neste dia.
                  </div>
                ) : (
                  selectedEvents.map((event) => {
                    const p = eventDayParts(event.date);
                    return (
                      <Link
                        key={event.id}
                        href={eventHref(event)}
                        className={cn(
                          "block rounded-xl border p-4 transition-opacity hover:opacity-90",
                          KIND_CARD[event.kind]
                        )}
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "mb-2 font-normal",
                            KIND_BADGE[event.kind]
                          )}
                        >
                          {AGENDA_KIND_LABEL[event.kind]}
                          {event.sectorName ? ` · ${event.sectorName}` : ""}
                        </Badge>
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">
                          {event.title}
                        </h3>
                        <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex gap-2">
                            <dt className="w-20 shrink-0">Cliente</dt>
                            <dd>{event.clientName}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-20 shrink-0">Horário</dt>
                            <dd>{p.time}</dd>
                          </div>
                          {event.assigneeName ? (
                            <div className="flex gap-2">
                              <dt className="w-20 shrink-0">Responsável</dt>
                              <dd>{event.assigneeName}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </div>
  );
}
