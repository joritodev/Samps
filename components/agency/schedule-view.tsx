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
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface ScheduleItem {
  id: string;
  title: string;
  clientName: string;
  /** ISO. Itens sem data aparecem só na lista. */
  date: string | null;
  status: string;
  statusLabel: string;
  meta: string | null;
}

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ScheduleView({
  title,
  description,
  dateLabel,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  /** Como a coluna de data se chama nesse módulo (ex.: "Prazo", "Data"). */
  dateLabel: string;
  items: ScheduleItem[];
  emptyMessage: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const key = format(new Date(item.date), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const dayItems = byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-background px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
            <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground/80">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="lista">
            <TabsList className="mb-4">
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="calendario">Calendário</TabsTrigger>
            </TabsList>

            <TabsContent value="lista">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Título</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">{dateLabel}</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-6 py-3">
                          <p className="font-medium text-foreground">
                            {item.title}
                          </p>
                          {item.meta ? (
                            <p className="text-xs text-muted-foreground">
                              {item.meta}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.clientName}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {item.date
                            ? format(new Date(item.date), "dd/MM/yyyy")
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className="font-normal">
                            {item.statusLabel}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="calendario">
              <div className="flex flex-col gap-4 xl:flex-row">
                <section className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMonth((m) => subMonths(m, 1))}
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h2 className="min-w-40 text-center text-sm font-semibold capitalize text-foreground">
                        {format(month, "MMMM yyyy", { locale: ptBR })}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMonth((m) => addMonths(m, 1))}
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                    {WEEK_DAYS.map((day) => (
                      <div
                        key={day}
                        className="bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    {days.map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const entries = byDay.get(key) ?? [];
                      const inMonth = isSameMonth(day, month);
                      const selected = isSameDay(day, selectedDay);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "flex min-h-24 flex-col gap-1 bg-card p-2 text-left transition-colors hover:bg-muted",
                            !inMonth && "bg-muted/40 text-muted-foreground",
                            selected && "ring-2 ring-inset ring-primary"
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
                          {entries.slice(0, 2).map((entry) => (
                            <span
                              key={entry.id}
                              title={entry.title}
                              className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-tight text-foreground"
                            >
                              {entry.title}
                            </span>
                          ))}
                          {entries.length > 2 ? (
                            <span className="text-xs text-muted-foreground">
                              +{entries.length - 2} mais
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-4 xl:w-72">
                  <h2 className="text-sm font-semibold text-foreground">
                    {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {dayItems.length ? (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.clientName}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-2 font-normal"
                          >
                            {item.statusLabel}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                        Nada neste dia.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
