"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Maximize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  BACKLOG,
  COL_WIDTH_DEFAULT,
  COL_WIDTH_MAX,
  COL_WIDTH_MIN,
  COL_WIDTH_STEP,
  clampColumnWidth,
  computeWeekTotals,
  containerKey,
  fittedColumnWidth,
  formatWeekParam,
  groupCards,
  zoomPercent,
} from "@/lib/agency/planning/board";
import { capacityFor, slotSuggestions } from "@/lib/agency/planning/capacity";
import { PLAN_SECTOR_CONFIG } from "@/lib/agency/planning/config";
import type { IsoWeek, PlanCardData } from "@/lib/agency/planning/types";
import {
  WEEKDAYS,
  dayDate,
  formatHours,
  formatShortDate,
  shiftWeek,
  weekRangeLabel,
  weeksInIsoYear,
} from "@/lib/agency/planning/week";
import type { PlanningBoardData } from "@/lib/services/planning.service";
import { PlanCardView } from "./plan-card-view";

const widthKey = (slug: string) => `samps:planning:col-width:${slug}`;
const modeKey = (slug: string) => `samps:planning:col-mode:${slug}`;

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // navegador sem armazenamento: a largura só não persiste
  }
}

export function PlanningBoard({
  data,
  todayWeek,
}: {
  data: PlanningBoardData;
  todayWeek: IsoWeek;
}) {
  const { sector, week, members, blocks, overrides, access } = data;
  const config = PLAN_SECTOR_CONFIG[sector.slug];
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startNavigation] = useTransition();
  const [cards] = useState<PlanCardData[]>(data.cards);
  const [columnWidth, setColumnWidth] = useState(COL_WIDTH_DEFAULT);
  const [fitMode, setFitMode] = useState(true);
  const boardRef = useRef<HTMLDivElement>(null);

  const isAbsent = useCallback(
    (memberId: string, key: string) => data.absentDays[memberId]?.includes(key) ?? false,
    [data.absentDays],
  );

  // Largura salva por setor; o padrão é "semana inteira".
  useEffect(() => {
    const saved = Number(readStorage(widthKey(sector.slug)));
    if (Number.isFinite(saved) && saved > 0) setColumnWidth(clampColumnWidth(saved));
    setFitMode(readStorage(modeKey(sector.slug)) !== "manual");
  }, [sector.slug]);

  useEffect(() => {
    const container = boardRef.current;
    if (!container || !fitMode) return;
    const apply = (width: number) => setColumnWidth(fittedColumnWidth(width));
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width);
    });
    observer.observe(container);
    apply(container.clientWidth);
    return () => observer.disconnect();
  }, [fitMode]);

  function changeColumnWidth(next: number) {
    const clamped = clampColumnWidth(next);
    setFitMode(false);
    setColumnWidth(clamped);
    writeStorage(widthKey(sector.slug), String(clamped));
    writeStorage(modeKey(sector.slug), "manual");
  }

  function fitWholeWeek() {
    setFitMode(true);
    writeStorage(modeKey(sector.slug), "fit");
  }

  function goToWeek(next: IsoWeek) {
    startNavigation(() => {
      router.push(`${pathname}?semana=${formatWeekParam(next)}`);
    });
  }

  const grouped = useMemo(() => groupCards(cards), [cards]);
  const totals = useMemo(
    () =>
      computeWeekTotals({
        week,
        members,
        cards,
        overrides,
        blocks,
        isAbsent,
        defaultKind: config.defaultKind,
        kinds: config.kinds,
      }),
    [week, members, cards, overrides, blocks, isAbsent, config],
  );
  const presetHours = useMemo(() => data.presets.map((p) => p.hours), [data.presets]);
  const sectorQuery = `?semana=${formatWeekParam(week)}`;

  return (
    <div className="-m-1 min-h-full rounded-xl bg-slate-200/70 pb-8 text-slate-900 sm:-m-2">
      <header className="sticky top-0 z-20 rounded-t-xl border-b-4 border-[#1d4ed8] bg-white/95 backdrop-blur">
        <div className="flex w-full flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
          <div className="mr-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1d4ed8]">
              Samps Digital
            </p>
            <h1 className="text-lg font-semibold text-[#0f1c3f]">{config.title}</h1>
          </div>
          <nav className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["video", "design"] as const).map((tab) => (
              <Link
                key={tab}
                href={`/planejamento-semanal/${tab}${sectorQuery}`}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  sector.slug === tab
                    ? "bg-[#0f1c3f] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {PLAN_SECTOR_CONFIG[tab].label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              aria-label="Semana anterior"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100"
              onClick={() => goToWeek(shiftWeek(week, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-medium text-[#0f1c3f]">{weekRangeLabel(week)}</span>
            <button
              type="button"
              aria-label="Próxima semana"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100"
              onClick={() => goToWeek(shiftWeek(week, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => goToWeek(todayWeek)}
          >
            Semana atual
          </button>
          <select
            aria-label="Semana"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            value={week.week}
            onChange={(e) => goToWeek({ ...week, week: Number(e.target.value) })}
          >
            {Array.from({ length: weeksInIsoYear(week.year) }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Semana {w}
              </option>
            ))}
          </select>
          <select
            aria-label="Ano"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
            value={week.year}
            onChange={(e) => goToWeek({ year: Number(e.target.value), week: 1 })}
          >
            {[week.year - 1, week.year, week.year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              title="Reduzir zoom"
              aria-label="Reduzir zoom"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              onClick={() => changeColumnWidth(columnWidth - COL_WIDTH_STEP)}
              disabled={columnWidth <= COL_WIDTH_MIN}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-xs font-medium text-[#0f1c3f]">
              {zoomPercent(columnWidth)}%
            </span>
            <button
              type="button"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              onClick={() => changeColumnWidth(columnWidth + COL_WIDTH_STEP)}
              disabled={columnWidth >= COL_WIDTH_MAX}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Ajustar para ver a semana inteira"
              className="flex h-8 items-center rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={fitWholeWeek}
            >
              <Maximize className="mr-1 h-4 w-4" /> Semana inteira
            </button>
          </div>
          {navigating && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label="Carregando" />}
        </div>
        {!access.canManage && (
          <p className="bg-slate-100 px-4 py-1 text-center text-xs text-slate-600">
            {access.canEdit
              ? "Acesso operacional — você pode criar, editar e mover cards. Excluir cards e configurar equipe, capacidade e modelos é função do gestor."
              : "Somente leitura — você pode acompanhar o planejamento, mas não alterar cards."}
          </p>
        )}
      </header>

      <div className="flex w-full flex-col gap-4 px-3 py-4 sm:px-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[clamp(14rem,16vw,20rem)]">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">
              Demandas não alocadas
            </h2>
            <p className="mb-2 text-xs font-medium text-amber-700">
              {(grouped.get(BACKLOG) ?? []).length} card(s)
            </p>
            <div className="min-h-[80px] space-y-2 rounded-md p-1">
              {(grouped.get(BACKLOG) ?? []).map((card) => (
                <PlanCardView key={card.id} card={card} members={members} kinds={config.kinds} />
              ))}
            </div>
          </div>
        </aside>

        <div ref={boardRef} className="w-full min-w-0 flex-1 overflow-x-auto">
          {members.length === 0 ? (
            <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-600">
              Nenhuma pessoa configurada neste setor ainda.
              {access.canManage
                ? " Adicione a equipe nas configurações do quadro."
                : " Peça ao gestor para configurar a equipe do quadro."}
            </div>
          ) : (
            <div className="flex min-w-max gap-3">
              {WEEKDAYS.map((day) => {
                const dayBlocked = blocks.some((b) => b.weekday === day.value && b.memberId === null);
                return (
                  <section
                    key={day.value}
                    style={{ width: columnWidth }}
                    className={`shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm ${
                      dayBlocked ? "border-rose-300" : "border-slate-300"
                    }`}
                  >
                    <div
                      className={`mb-2 flex items-center justify-between px-3 py-2 ${
                        dayBlocked ? "bg-rose-600" : "bg-[#0f1c3f]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-white">
                          {day.short}
                        </p>
                        <p className="text-xs text-white/70">
                          {formatShortDate(dayDate(week, day.value))}
                        </p>
                      </div>
                      <Lock className="h-4 w-4 text-white/70" aria-hidden />
                    </div>
                    {dayBlocked && (
                      <p className="mx-3 mb-2 rounded-md bg-rose-100 px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-rose-700">
                        Feriado / dia bloqueado
                      </p>
                    )}
                    <div
                      className={`grid gap-2 px-3 pb-3 ${
                        columnWidth < 340 ? "grid-cols-1" : "grid-cols-2"
                      }`}
                    >
                      {members.map((member) => {
                        const key = containerKey(member.id, day.value);
                        const list = grouped.get(key) ?? [];
                        const capacity = capacityFor(member, week, day.value, overrides, blocks, isAbsent);
                        const used = list.reduce((s, c) => s + c.durationHours, 0);
                        const free = capacity - used;
                        const memberBlocked = blocks.some(
                          (b) => b.weekday === day.value && b.memberId === member.id,
                        );
                        const fillPct =
                          capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
                        return (
                          <div
                            key={key}
                            className={`rounded-lg border p-2 ${
                              memberBlocked
                                ? "border-rose-200 bg-rose-50"
                                : free < 0
                                  ? "border-rose-200 bg-rose-50/60"
                                  : free === 0
                                    ? "border-emerald-200 bg-emerald-50/60"
                                    : "border-slate-200 bg-slate-50"
                            }`}
                            style={{ borderTop: `3px solid ${member.color}` }}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span
                                className="text-xs font-bold uppercase tracking-wide"
                                style={{ color: member.color }}
                              >
                                {member.name}
                              </span>
                              <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                            </div>
                            <div className="min-h-[80px] space-y-2 rounded-md p-1">
                              {list.map((card) => (
                                <PlanCardView
                                  key={card.id}
                                  card={card}
                                  members={members}
                                  kinds={config.kinds}
                                />
                              ))}
                            </div>
                            <div className="mt-2 border-t border-slate-200 pt-2 text-sm font-medium text-slate-700">
                              <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    free < 0
                                      ? "bg-rose-500"
                                      : fillPct >= 90
                                        ? "bg-emerald-500"
                                        : "bg-blue-500"
                                  }`}
                                  style={{ width: `${free < 0 ? 100 : fillPct}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                <p className="rounded bg-blue-100 px-2 py-1 text-blue-900">
                                  Disponível: {formatHours(capacity)}
                                </p>
                                <p className="rounded bg-amber-100 px-2 py-1 text-amber-900">
                                  Ocupado: {formatHours(used)}
                                </p>
                                {free >= 0 ? (
                                  <p className="rounded bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                                    Livre: {formatHours(free)}
                                  </p>
                                ) : (
                                  <p className="rounded bg-rose-100 px-2 py-1 font-semibold text-rose-700">
                                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                                    Sobrecarga de {formatHours(-free)}
                                  </p>
                                )}
                              </div>
                              {free > 0 && (
                                <p className="text-slate-400">
                                  Pode receber: {slotSuggestions(free, presetHours).join(" • ")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <section className="mt-2 w-full px-3 sm:px-4">
        <div className="grid gap-3 md:grid-cols-3">
          {totals.perMember.map((row) => (
            <div key={row.member.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold" style={{ color: row.member.color }}>
                {row.member.name}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-semibold">
                <p className="rounded bg-blue-100 px-2 py-2 text-blue-900">
                  Disponível
                  <br />
                  {formatHours(row.capacity)}
                </p>
                <p className="rounded bg-amber-100 px-2 py-2 text-amber-900">
                  Ocupado
                  <br />
                  {formatHours(row.used)}
                </p>
                <p
                  className={`rounded px-2 py-2 ${
                    row.free >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {row.free >= 0 ? "Livre" : "Sobrecarga"}
                  <br />
                  {formatHours(Math.abs(row.free))}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {config.itemLabel} programados: {row.items}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-[#0f1c3f]/15 bg-[#0f1c3f] p-4 text-white">
            <p className="text-base font-semibold">Total da semana</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-semibold">
              <p className="rounded bg-blue-500/30 px-2 py-2">
                Disponível
                <br />
                {formatHours(totals.capacity)}
              </p>
              <p className="rounded bg-amber-500/30 px-2 py-2">
                Ocupado
                <br />
                {formatHours(totals.used)}
              </p>
              <p
                className={`rounded px-2 py-2 ${
                  totals.free >= 0 ? "bg-emerald-500/30" : "bg-rose-500/40"
                }`}
              >
                {totals.free >= 0 ? "Livre" : "Sobrecarga"}
                <br />
                {formatHours(Math.abs(totals.free))}
              </p>
            </div>
            {totals.byKind.map((item) => (
              <p key={item.label} className="mt-1 text-sm opacity-90">
                {item.label}: {item.count} ({formatHours(item.hours)})
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
