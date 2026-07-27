"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type EventTone = "green" | "yellow" | "orange" | "zinc";

type FilterKey = "feeds" | "stories" | "video" | "follow_up" | "extras";

type DemandEvent = {
  id: string;
  title: string;
  type?: string;
  format?: string | null;
  status: string;
  publishDate?: Date | string | null;
  dueDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  client?: { name: string } | null;
  assignee?: { name: string } | null;
};

type CalendarItem = {
  id: string;
  demandId: string;
  title: string;
  date: Date;
  type: string;
  filterKey: FilterKey;
  tone: EventTone;
  status: string;
  format?: string | null;
  clientName?: string;
  assigneeName?: string;
  kindLabel: string;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "feeds", label: "Feeds" },
  { key: "stories", label: "Stories" },
  { key: "video", label: "Vídeo / Reel" },
  { key: "follow_up", label: "Acompanhamento" },
  { key: "extras", label: "Extras" },
];

const TYPE_LABEL: Record<string, string> = {
  FEED: "Feed",
  STORY: "Story",
  REEL: "Reel",
  VIDEO: "Vídeo",
  DESIGN: "Design",
  COPY: "Copy",
  FOLLOW_UP: "Acompanhamento",
  EXTRA: "Extra",
  PROJECT_TASK: "Projeto",
  OTHER: "Outro",
};

function resolveFilterKey(type: string): FilterKey {
  switch (type) {
    case "FEED":
      return "feeds";
    case "STORY":
      return "stories";
    case "REEL":
    case "VIDEO":
      return "video";
    case "FOLLOW_UP":
      return "follow_up";
    default:
      return "extras";
  }
}

function resolveTone(type: string): EventTone {
  switch (type) {
    case "FEED":
      return "green";
    case "STORY":
      return "yellow";
    case "REEL":
    case "VIDEO":
      return "orange";
    default:
      return "zinc";
  }
}

function resolveKindLabel(d: DemandEvent): string {
  if (d.publishDate) return "Publicação";
  if (d.dueDate) return "Prazo";
  if (d.deliveryDate) return "Entrega";
  return "Agenda";
}

function eventDate(d: DemandEvent): Date | null {
  const raw = d.publishDate ?? d.dueDate ?? d.deliveryDate;
  if (!raw) return null;
  return new Date(raw);
}

function buildItems(demands: DemandEvent[]): CalendarItem[] {
  return demands
    .map((d) => {
      const date = eventDate(d);
      if (!date) return null;
      const type = d.type ?? "OTHER";
      return {
        id: d.id,
        demandId: d.id,
        title: d.title,
        date,
        type,
        filterKey: resolveFilterKey(type),
        tone: resolveTone(type),
        status: d.status,
        format: d.format,
        clientName: d.client?.name,
        assigneeName: d.assignee?.name,
        kindLabel: resolveKindLabel(d),
      } satisfies CalendarItem;
    })
    .filter(Boolean) as CalendarItem[];
}

export function BoardCalendar({
  demands,
  onSelect,
  clientName,
}: {
  demands: DemandEvent[];
  onSelect: (id: string) => void;
  clientName?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    feeds: true,
    stories: true,
    video: true,
    follow_up: true,
    extras: true,
  });

  const allItems = useMemo(() => buildItems(demands), [demands]);

  const activeFilterKeys = useMemo(() => {
    const present = new Set(allItems.map((i) => i.filterKey));
    return FILTER_OPTIONS.filter((o) => present.has(o.key));
  }, [allItems]);

  const filtered = useMemo(
    () => allItems.filter((i) => filters[i.filterKey]),
    [allItems, filters]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of filtered) {
      const key = format(item.date, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [filtered]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayItems = (eventsByDay.get(selectedKey) ?? []).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const weekCount = Math.ceil(days.length / 7);

  const selectedDateLabel = format(selectedDay, "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="min-h-0 xl:col-span-2">
          <Card className="rounded-2xl shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tipos
              </p>
              {(activeFilterKeys.length ? activeFilterKeys : FILTER_OPTIONS).map(
                (opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <Checkbox
                      checked={filters[opt.key]}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          [opt.key]: checked === true,
                        }))
                      }
                    />
                    {opt.label}
                  </label>
                )
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="flex min-h-0 flex-col xl:col-span-7">
          <Card className="flex h-full min-h-0 flex-col rounded-2xl shadow-none">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 pb-3 pt-4">
              <CardTitle className="text-base font-semibold capitalize tracking-tight">
                {format(month, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setMonth(startOfMonth(today));
                    setSelectedDay(today);
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
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
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, month);
                  const isSelected = isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "flex min-h-0 flex-col overflow-hidden bg-card p-1.5 text-left transition-colors",
                        inMonth && "hover:bg-muted",
                        !inMonth && "bg-muted/80 text-muted-foreground",
                        isSelected && "ring-2 ring-inset ring-green-400/70",
                        isToday && !isSelected && "bg-green-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-muted-foreground",
                          isToday && "bg-green-600 text-white"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                              TONE_CHIP[event.tone]
                            )}
                            title={event.title}
                          >
                            <span className="block truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 ? (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{dayEvents.length - 2} mais
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex min-h-0 flex-col xl:col-span-3">
          <Card className="flex h-full min-h-0 flex-col rounded-2xl shadow-none">
            <CardHeader className="shrink-0 pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Detalhes da Demanda
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedDateLabel}</p>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {dayItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma entrega neste dia.
                </div>
              ) : (
                dayItems.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect(event.demandId)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-opacity hover:opacity-90",
                      TONE_CARD[event.tone]
                    )}
                  >
                    <Badge
                      variant="outline"
                      className={cn("mb-2 font-normal", TONE_BADGE[event.tone])}
                    >
                      {event.kindLabel} · {TYPE_LABEL[event.type] ?? event.type}
                    </Badge>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {event.title}
                    </h3>
                    <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {(event.clientName || clientName) && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0">Cliente</dt>
                          <dd>{event.clientName ?? clientName}</dd>
                        </div>
                      )}
                      {event.assigneeName && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0">Responsável</dt>
                          <dd>{event.assigneeName}</dd>
                        </div>
                      )}
                      {event.format && (
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0">Formato</dt>
                          <dd>{event.format}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0">Status</dt>
                        <dd>{event.status}</dd>
                      </div>
                    </dl>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
