"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  countFilters,
  toggleValue,
  type BoardFilters,
  type DueFilter,
  type FilterOption,
  type FilterOptions,
} from "@/lib/agency/board-filters";

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "overdue", label: "Atrasadas" },
  { value: "week", label: "Próximos 7 dias" },
  { value: "none", label: "Sem prazo" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "max-w-full truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function Group({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-muted-foreground">
        {title}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip
            key={o.value}
            active={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function BoardFilterPopover({
  filters,
  options,
  onChange,
}: {
  filters: BoardFilters;
  options: FilterOptions;
  onChange: (filters: BoardFilters) => void;
}) {
  const count = countFilters(filters);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {count > 0 ? (
            <span className="num rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[70vh] w-80 space-y-4 overflow-y-auto"
      >
        <Group
          title="Cliente"
          options={options.client}
          selected={filters.client}
          onToggle={(v) =>
            onChange({ ...filters, client: toggleValue(filters.client, v) })
          }
        />
        <Group
          title="Responsável"
          options={options.assignee}
          selected={filters.assignee}
          onToggle={(v) =>
            onChange({ ...filters, assignee: toggleValue(filters.assignee, v) })
          }
        />
        <Group
          title="Setor"
          options={options.sector}
          selected={filters.sector}
          onToggle={(v) =>
            onChange({ ...filters, sector: toggleValue(filters.sector, v) })
          }
        />
        <Group
          title="Prioridade"
          options={options.priority}
          selected={filters.priority}
          onToggle={(v) =>
            onChange({ ...filters, priority: toggleValue(filters.priority, v) })
          }
        />
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-muted-foreground">
            Prazo
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {DUE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                active={filters.due === o.value}
                onClick={() =>
                  onChange({
                    ...filters,
                    due: filters.due === o.value ? null : o.value,
                  })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        {count > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="w-full"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Limpar filtros
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
