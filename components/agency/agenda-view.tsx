"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Layers,
  Share2,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type EventTone = "green" | "yellow" | "orange" | "zinc";

type AgendaEvent = {
  id: string;
  title: string;
  client: string;
  time: string;
  note: string;
  sector: "social" | "design" | "video";
  type: "feeds" | "stories" | "captacoes";
  day: number;
  tone: EventTone;
};

const TONE_CHIP: Record<EventTone, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  orange: "bg-orange-100 text-orange-800",
  zinc: "bg-muted text-foreground/80",
};

const TONE_CARD: Record<EventTone, string> = {
  green: "border-green-200/70 bg-green-50/70",
  yellow: "border-yellow-200/70 bg-yellow-50/70",
  orange: "border-orange-200/70 bg-orange-50/70",
  zinc: "border-border bg-muted",
};

const TONE_BADGE: Record<EventTone, string> = {
  green: "border-green-200 bg-green-100/80 text-green-800",
  yellow: "border-yellow-200 bg-yellow-100/80 text-yellow-800",
  orange: "border-orange-200 bg-orange-100/80 text-orange-800",
  zinc: "border-border bg-muted text-foreground/80",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MOCK_EVENTS: AgendaEvent[] = [
  {
    id: "e1",
    title: "Carrossel Sorriso",
    client: "Clínica Sorriso",
    time: "09:00",
    note: "5 slides — tom institucional, CTA agendar avaliação.",
    sector: "design",
    type: "feeds",
    day: 8,
    tone: "green",
  },
  {
    id: "e2",
    title: "Stories agenda",
    client: "Clínica Sorriso",
    time: "11:30",
    note: "Sequência de 4 frames com horários da semana.",
    sector: "social",
    type: "stories",
    day: 8,
    tone: "yellow",
  },
  {
    id: "e3",
    title: "Gravação Clínica",
    client: "Bella Clinic",
    time: "14:00",
    note: "Captação de depoimento + bastidores da unidade.",
    sector: "video",
    type: "captacoes",
    day: 14,
    tone: "orange",
  },
  {
    id: "e4",
    title: "Feed premium",
    client: "Bella Clinic",
    time: "10:00",
    note: "Arte aprovada — publicar feed linha premium.",
    sector: "social",
    type: "feeds",
    day: 21,
    tone: "green",
  },
  {
    id: "e5",
    title: "Reels higiene oral",
    client: "Clínica Sorriso",
    time: "16:30",
    note: "Entrega de arte + legendas para publicação.",
    sector: "design",
    type: "feeds",
    day: 21,
    tone: "yellow",
  },
  {
    id: "e6",
    title: "Thumbnails Q3",
    client: "Bella Clinic",
    time: "13:00",
    note: "3 thumbs com tipografia forte para YouTube.",
    sector: "design",
    type: "feeds",
    day: 26,
    tone: "zinc",
  },
  {
    id: "e7",
    title: "Stories bastidores",
    client: "Bella Clinic",
    time: "18:00",
    note: "Publicação dos stories de bastidores.",
    sector: "social",
    type: "stories",
    day: 26,
    tone: "green",
  },
];

const KPIS = [
  {
    id: "total",
    label: "Total de Entregas",
    value: 12,
    icon: Package,
    className: "border-green-200/70 bg-green-50/80",
    iconClass: "bg-green-100 text-green-700",
  },
  {
    id: "social",
    label: "Social Media",
    value: 5,
    icon: Share2,
    className: "border-border bg-card",
    iconClass: "bg-muted text-muted-foreground",
  },
  {
    id: "design",
    label: "Design",
    value: 4,
    icon: Layers,
    className: "border-border bg-card",
    iconClass: "bg-muted text-muted-foreground",
  },
  {
    id: "video",
    label: "Vídeo",
    value: 3,
    icon: Clapperboard,
    className: "border-border bg-card",
    iconClass: "bg-muted text-muted-foreground",
  },
] as const;

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

export function AgendaView() {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [sectors, setSectors] = useState({
    social: true,
    design: true,
    video: true,
  });
  const [types, setTypes] = useState({
    feeds: true,
    stories: true,
    captacoes: true,
  });

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

  const filteredEvents = MOCK_EVENTS.filter(
    (event) => sectors[event.sector] && types[event.type]
  );

  const selectedEvents = filteredEvents.filter(
    (event) => event.day === selectedDay
  );

  const selectedDateLabel = new Date(year, month, selectedDay).toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "long", year: "numeric" }
  );

  function shiftMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#F8F9FA]">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Agenda
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Calendário editorial e entregas programadas
        </p>
      </header>

      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.id}
                className={cn("rounded-2xl shadow-none", kpi.className)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      kpi.iconClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
                      {kpi.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Filtros */}
          <aside className="xl:col-span-2">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Setores
                  </p>
                  {(
                    [
                      ["social", "Social Media"],
                      ["design", "Design"],
                      ["video", "Vídeo"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={sectors[key]}
                        onCheckedChange={(checked) =>
                          setSectors((prev) => ({
                            ...prev,
                            [key]: checked === true,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tipos
                  </p>
                  {(
                    [
                      ["feeds", "Feeds"],
                      ["stories", "Stories"],
                      ["captacoes", "Captações"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={types[key]}
                        onCheckedChange={(checked) =>
                          setTypes((prev) => ({
                            ...prev,
                            [key]: checked === true,
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Calendário */}
          <div className="xl:col-span-7">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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
              <CardContent className="space-y-2">
                <div className="grid grid-cols-7 gap-px">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
                  {cells.map((cell) => {
                    const dayEvents = cell.day
                      ? filteredEvents.filter((e) => e.day === cell.day)
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
                          "min-h-[120px] bg-card p-2 text-left transition-colors",
                          cell.day && "hover:bg-muted",
                          !cell.day && "bg-muted/80",
                          isSelected && "ring-2 ring-inset ring-green-400/70",
                          isToday && !isSelected && "bg-green-50/40"
                        )}
                      >
                        {cell.day ? (
                          <>
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-muted-foreground",
                                isToday && "bg-green-600 text-white"
                              )}
                            >
                              {cell.day}
                            </span>
                            <div className="mt-1.5 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "truncate rounded-md px-1.5 py-1 text-[10px] font-medium leading-tight",
                                    TONE_CHIP[event.tone]
                                  )}
                                >
                                  <span className="block truncate">
                                    {event.title}
                                  </span>
                                  <span className="opacity-80">{event.time}</span>
                                </div>
                              ))}
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

          {/* Detalhes */}
          <aside className="xl:col-span-3">
            <Card className="rounded-2xl shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Detalhes da Demanda
                </CardTitle>
                <p className="text-sm text-muted-foreground">{selectedDateLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma entrega neste dia.
                  </div>
                ) : (
                  selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "rounded-xl border p-4",
                        TONE_CARD[event.tone]
                      )}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "mb-2 font-normal",
                          TONE_BADGE[event.tone]
                        )}
                      >
                        {event.sector === "social"
                          ? "Social Media"
                          : event.sector === "design"
                            ? "Design"
                            : "Vídeo"}
                      </Badge>
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        {event.title}
                      </h3>
                      <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">Cliente</dt>
                          <dd>{event.client}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">Horário</dt>
                          <dd>{event.time}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 text-muted-foreground">Nota</dt>
                          <dd className="leading-relaxed">{event.note}</dd>
                        </div>
                      </dl>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </div>
  );
}
