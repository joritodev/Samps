"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type CalendarDemand = {
  id: string;
  title: string;
  type: string;
  status: string;
  format?: string | null;
  dueDate?: string | null;
  deliveryDate?: string | null;
  publishDate?: string | null;
  client?: { id: string; name: string; brandColor?: string | null } | null;
  assignee?: { name: string } | null;
  sector?: { name: string } | null;
};

type AgendaKind = "due" | "delivery" | "publish";
type CategoryId = "content" | "video" | "other";

type CalendarEvent = {
  id: string;
  demandId: string;
  title: string;
  date: Date;
  kind: AgendaKind;
  category: CategoryId;
  clientId?: string;
  clientName?: string;
  assigneeName?: string;
  status: string;
  format?: string | null;
  type: string;
  sectorName?: string;
};

const AGENDA_OPTIONS: { id: AgendaKind; label: string }[] = [
  { id: "due", label: "Prazos de demanda" },
  { id: "delivery", label: "Entregas" },
  { id: "publish", label: "Publicações" },
];

const CATEGORY_OPTIONS: {
  id: CategoryId;
  label: string;
  chip: string;
  panel: string;
  dot: string;
}[] = [
  {
    id: "content",
    label: "Conteúdo / Design",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-100",
    panel: "bg-emerald-50/80 border-emerald-100",
    dot: "bg-emerald-400",
  },
  {
    id: "video",
    label: "Vídeo / Reel",
    chip: "bg-amber-50 text-amber-900 border-amber-100",
    panel: "bg-amber-50/80 border-amber-100",
    dot: "bg-amber-400",
  },
  {
    id: "other",
    label: "Projetos e outros",
    chip: "bg-slate-100 text-slate-700 border-slate-200",
    panel: "bg-slate-100/80 border-slate-200",
    dot: "bg-slate-400",
  },
];

const CONTENT_TYPES = new Set(["FEED", "STORY", "DESIGN", "COPY", "FOLLOW_UP"]);
const VIDEO_TYPES = new Set(["VIDEO", "REEL"]);

const KIND_LABEL: Record<AgendaKind, string> = {
  due: "Prazo",
  delivery: "Entrega",
  publish: "Publicação",
};

function resolveCategory(type: string): CategoryId {
  if (CONTENT_TYPES.has(type)) return "content";
  if (VIDEO_TYPES.has(type)) return "video";
  return "other";
}

function buildEvents(demands: CalendarDemand[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const d of demands) {
    const category = resolveCategory(d.type);
    const base = {
      demandId: d.id,
      title: d.title,
      category,
      clientId: d.client?.id,
      clientName: d.client?.name,
      assigneeName: d.assignee?.name,
      status: d.status,
      format: d.format,
      type: d.type,
      sectorName: d.sector?.name,
    };
    if (d.dueDate) {
      events.push({
        ...base,
        id: `${d.id}-due`,
        date: new Date(d.dueDate),
        kind: "due",
      });
    }
    if (d.deliveryDate) {
      events.push({
        ...base,
        id: `${d.id}-delivery`,
        date: new Date(d.deliveryDate),
        kind: "delivery",
      });
    }
    if (d.publishDate) {
      events.push({
        ...base,
        id: `${d.id}-publish`,
        date: new Date(d.publishDate),
        kind: "publish",
      });
    }
  }
  return events;
}

function categoryStyle(id: CategoryId) {
  return CATEGORY_OPTIONS.find((c) => c.id === id)!;
}

export function AgencyCalendar({ demands }: { demands: CalendarDemand[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [showFilters, setShowFilters] = useState(true);
  const [agendaKinds, setAgendaKinds] = useState<AgendaKind[]>([
    "due",
    "delivery",
    "publish",
  ]);
  const [categories, setCategories] = useState<CategoryId[]>([
    "content",
    "video",
    "other",
  ]);

  const allEvents = useMemo(() => buildEvents(demands), [demands]);

  const filtered = useMemo(
    () =>
      allEvents.filter(
        (e) => agendaKinds.includes(e.kind) && categories.includes(e.category)
      ),
    [allEvents, agendaKinds, categories]
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const content = filtered.filter((e) => e.category === "content").length;
    const video = filtered.filter((e) => e.category === "video").length;
    const other = filtered.filter((e) => e.category === "other").length;
    return { total, content, video, other };
  }, [filtered]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const key = format(e.date, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayEvents = (eventsByDay.get(selectedKey) ?? []).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  function toggleAgenda(id: AgendaKind) {
    setAgendaKinds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleCategory(id: CategoryId) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">
          Dashboard / <span className="text-foreground">Calendário</span>
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
          Calendário
        </h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Briefcase}
          label="Total na agenda"
          value={stats.total}
          className="bg-primary/10"
          iconClassName="text-primary"
        />
        <StatTile
          icon={CalendarDays}
          label="Conteúdo / Design"
          value={stats.content}
        />
        <StatTile icon={Package} label="Vídeo / Reel" value={stats.video} />
        <StatTile icon={Send} label="Projetos e outros" value={stats.other} />
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Filters */}
        {showFilters && (
          <aside className="w-full shrink-0 rounded-2xl border border-border/60 bg-card p-5 shadow-soft xl:w-64">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filtros</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Agenda</p>
                <div className="space-y-3">
                  {AGENDA_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={agendaKinds.includes(opt.id)}
                        onCheckedChange={() => toggleAgenda(opt.id)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Categoria</p>
                <div className="space-y-3">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={categories.includes(opt.id)}
                        onCheckedChange={() => toggleCategory(opt.id)}
                      />
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full", opt.dot)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Month grid */}
        <section className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-display text-xl font-semibold capitalize">
                {format(month, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!showFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setMonth(startOfMonth(today));
                  setSelectedDay(today);
                }}
              >
                Hoje
              </Button>
              <Button size="sm" asChild>
                <Link href="/clientes">+ Nova demanda</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50">
            {weekDays.map((d) => (
              <div
                key={d}
                className="bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayItems = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const selected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-[110px] flex-col gap-1 bg-card p-2 text-left transition-colors hover:bg-secondary/40",
                    !inMonth && "bg-muted/30 text-muted-foreground",
                    selected && "ring-2 ring-inset ring-primary",
                    isToday && !selected && "bg-secondary/50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      selected && "bg-primary text-primary-foreground",
                      isToday && !selected && "font-bold text-primary"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayItems.slice(0, 3).map((ev) => {
                      const style = categoryStyle(ev.category);
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                            style.chip
                          )}
                          title={`${KIND_LABEL[ev.kind]} · ${ev.title}`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayItems.length - 3} mais
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Day details */}
        <aside className="w-full shrink-0 rounded-2xl border border-border/60 bg-card p-5 shadow-soft xl:w-80">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">Detalhes do dia</h2>
            <p className="text-sm text-muted-foreground">
              {format(selectedDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="space-y-3">
            {dayEvents.length ? (
              dayEvents.map((ev) => {
                const style = categoryStyle(ev.category);
                return (
                  <div
                    key={ev.id}
                    className={cn(
                      "rounded-xl border p-4",
                      style.panel
                    )}
                  >
                    <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                      {KIND_LABEL[ev.kind]} ·{" "}
                      {CATEGORY_OPTIONS.find((c) => c.id === ev.category)?.label}
                    </span>
                    <h3 className="mt-2 font-display text-sm font-semibold text-foreground">
                      {ev.title}
                    </h3>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {ev.clientName && (
                        <p>
                          <span className="font-medium text-foreground">Cliente:</span>{" "}
                          {ev.clientName}
                        </p>
                      )}
                      {ev.assigneeName && (
                        <p>
                          <span className="font-medium text-foreground">Responsável:</span>{" "}
                          {ev.assigneeName}
                        </p>
                      )}
                      {ev.format && (
                        <p>
                          <span className="font-medium text-foreground">Formato:</span>{" "}
                          {ev.format}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-foreground">Status:</span>{" "}
                        {ev.status}
                      </p>
                    </div>
                    {ev.clientId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full bg-white/80"
                        asChild
                      >
                        <Link href={`/clientes/${ev.clientId}/quadro`}>
                          Abrir no quadro
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nenhuma agenda neste dia.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  className,
  iconClassName,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-soft",
        className
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground",
          iconClassName
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
