"use client";

import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type DemandEvent = {
  id: string;
  title: string;
  publishDate?: Date | null;
  dueDate?: Date | null;
  deliveryDate?: Date | null;
  status: string;
};

export function BoardCalendar({
  demands,
  onSelect,
}: {
  demands: DemandEvent[];
  onSelect: (id: string) => void;
}) {
  const events: Event[] = demands
    .map((d) => {
      const start = d.publishDate ?? d.dueDate ?? d.deliveryDate;
      if (!start) return null;
      const date = new Date(start);
      return {
        id: d.id,
        title: d.title,
        start: date,
        end: date,
        resource: d,
      };
    })
    .filter(Boolean) as Event[];

type CalendarEvent = Event & { id?: string | number; resource?: DemandEvent };

  return (
    <div className="h-[600px] rounded-xl border bg-white p-4 shadow-sm">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="pt-BR"
        messages={{
          today: "Hoje",
          previous: "Anterior",
          next: "Próximo",
          month: "Mês",
          week: "Semana",
          day: "Dia",
        }}
        onSelectEvent={(event: CalendarEvent) => {
          const id = event.id ?? event.resource?.id;
          if (id) onSelect(String(id));
        }}
      />
    </div>
  );
}
