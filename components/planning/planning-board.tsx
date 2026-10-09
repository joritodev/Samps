"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Lock,
  Maximize,
  Plus,
  Settings,
  Sparkles,
  Unlock,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyDistributionAction,
  createPlanCardAction,
  deletePlanCardAction,
  duplicatePlanCardAction,
  duplicatePreviousWeekAction,
  movePlanCardAction,
  movePlanCardToDateAction,
  previewDistributionAction,
  syncPlanWeekAction,
  toggleDayBlockAction,
  togglePlanCardCompleteAction,
  updatePlanCardAction,
} from "@/lib/actions/planning.actions";
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
  parseContainerKey,
  zoomPercent,
} from "@/lib/agency/planning/board";
import { canDragCard, statusAfterMove } from "@/lib/agency/planning/card-input";
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
import type { DistributionPreview } from "@/lib/services/planning-distribution.service";
import type { PlanningBoardData } from "@/lib/services/planning.service";
import { PlanCardView } from "./plan-card-view";
import { ClientsDialog } from "./clients-dialog";
import { PlanColumn } from "./plan-column";
import { SettingsDialog } from "./settings-dialog";
import { CardDialog, cardToDraft, draftToInput, emptyDraft, type CardDraft } from "./card-dialog";
import { DistributionDialog } from "./distribution-dialog";
import { HistoryDialog } from "./history-dialog";
import { MoveCardDialog } from "./move-card-dialog";

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
  const [cards, setCards] = useState<PlanCardData[]>(data.cards);
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<PlanCardData | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [distribution, setDistribution] = useState<DistributionPreview | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overContainer, setOverContainer] = useState<string | null>(null);
  const canEdit = access.canEdit;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Depois de salvar, o servidor devolve o quadro atualizado.
  useEffect(() => {
    setCards(data.cards);
  }, [data.cards]);

  // A gestão, ao abrir uma semana a partir da atual, completa os cards das demandas fixas.
  const canManage = access.canManage;
  const notInPast =
    week.year * 100 + week.week >= todayWeek.year * 100 + todayWeek.week;
  useEffect(() => {
    if (!canManage || !notInPast) return;
    let cancelled = false;
    void syncPlanWeekAction(sector.slug, week).then((result) => {
      if (cancelled || "error" in result) return;
      if (result.generated || result.duplicated) router.refresh();
    });
    return () => {
      cancelled = true;
    };
    // roda uma vez por montagem: o quadro é remontado a cada troca de semana ou setor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  function containerOf(id: string) {
    if (id === BACKLOG || parseContainerKey(id)) return id;
    const card = cards.find((c) => c.id === id);
    if (!card) return BACKLOG;
    return card.memberId && card.weekday ? containerKey(card.memberId, card.weekday) : BACKLOG;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    setOverContainer(event.over ? containerOf(String(event.over.id)) : null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverContainer(null);
    const { active, over } = event;
    if (!over || !canEdit) return;
    const cardId = String(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card || !canDragCard(card)) return;

    const from = containerOf(cardId);
    const to = containerOf(String(over.id));
    const fromList = [...(grouped.get(from) ?? [])];
    const toList = from === to ? fromList : [...(grouped.get(to) ?? [])];
    const oldIndex = fromList.findIndex((c) => c.id === cardId);
    let newIndex = toList.findIndex((c) => c.id === String(over.id));
    if (newIndex === -1) newIndex = toList.length;

    let nextTo: PlanCardData[];
    if (from === to) {
      nextTo = arrayMove(fromList, oldIndex, Math.min(newIndex, fromList.length - 1));
    } else {
      fromList.splice(oldIndex, 1);
      nextTo = [...toList];
      nextTo.splice(newIndex, 0, card);
    }
    if (from === to && nextTo.every((c, i) => c.id === fromList[i]?.id)) return;

    const target = parseContainerKey(to);
    const previous = cards;
    const positions = new Map<string, number>();
    nextTo.forEach((c, index) => positions.set(c.id, index));
    if (from !== to) fromList.forEach((c, index) => positions.set(c.id, index));
    setCards((current) =>
      current.map((c) => {
        const position = positions.get(c.id);
        if (position === undefined) return c;
        if (c.id !== cardId) return { ...c, position };
        return {
          ...c,
          position,
          memberId: target ? target.memberId : c.memberId,
          weekday: target ? target.weekday : null,
          isoYear: target ? week.year : c.isoYear,
          isoWeek: target ? week.week : c.isoWeek,
          status: statusAfterMove(c.status, Boolean(target)),
        };
      }),
    );

    const result = await movePlanCardAction({
      cardId,
      to: target ? { ...target, isoYear: week.year, isoWeek: week.week } : null,
      orderedIds: nextTo.map((c) => c.id),
      fromOrderedIds: from === to ? [] : fromList.map((c) => c.id),
    });
    if ("error" in result) {
      setCards(previous);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    const input = draftToInput(draft);
    const result = draft.id
      ? await updatePlanCardAction(draft.id, week, input)
      : await createPlanCardAction(sector.slug, week, input);
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setDraft(null);
    router.refresh();
  }

  async function toggleComplete(card: PlanCardData) {
    const previous = cards;
    const reopened = card.weekday && card.memberId ? "PROGRAMADO" : "NAO_ALOCADO";
    const next = card.status === "CONCLUIDO" ? reopened : "CONCLUIDO";
    setCards((current) => current.map((c) => (c.id === card.id ? { ...c, status: next } : c)));
    const result = await togglePlanCardCompleteAction(card.id);
    if ("error" in result) {
      setCards(previous);
      toast.error("Não foi possível atualizar a conclusão.");
      return;
    }
    router.refresh();
  }

  async function duplicate(card: PlanCardData) {
    const result = await duplicatePlanCardAction(card.id, week);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Cópia criada em Demandas não alocadas");
    router.refresh();
  }

  async function remove(card: PlanCardData) {
    if (!access.canManage) {
      toast.error("Apenas o gestor pode excluir cards.");
      return;
    }
    if (!window.confirm(`Excluir o card "${card.title}"?`)) return;
    const previous = cards;
    setCards((current) => current.filter((c) => c.id !== card.id));
    const result = await deletePlanCardAction(card.id);
    if ("error" in result) {
      setCards(previous);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function runDistribution(variant: number, relaxed: boolean) {
    setSuggesting(true);
    const result = await previewDistributionAction(sector.slug, { variant, relaxed });
    setSuggesting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("empty" in result) {
      toast.info("Não existem demandas não alocadas");
      return;
    }
    setDistribution(result.preview);
  }

  async function applyDistribution() {
    if (!distribution) return;
    if (!distribution.moves.length) {
      setDistribution(null);
      toast.info("Nada a reorganizar — a semana já está equilibrada");
      return;
    }
    setSuggesting(true);
    const result = await applyDistributionAction(sector.slug, {
      variant: distribution.variant,
      relaxed: distribution.relaxed,
      signature: distribution.signature,
    });
    setSuggesting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.applied} card(s) reorganizados`);
    setDistribution(null);
    router.refresh();
  }

  async function toggleBlock(weekday: number, memberId: string | null) {
    const result = await toggleDayBlockAction(sector.slug, week, weekday, memberId);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function duplicatePrevious() {
    const result = await duplicatePreviousWeekAction(sector.slug, week);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.created ? `${result.created} card(s) copiados da semana anterior` : "Nada para duplicar",
    );
    if (result.created) router.refresh();
  }

  async function moveTo(card: PlanCardData, dateKey: string | null, memberId: string | null) {
    const result = await movePlanCardToDateAction(card.id, dateKey, memberId);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setMoving(null);
    router.refresh();
  }

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
          {canEdit && (
            <button
              type="button"
              className="flex h-9 items-center rounded-md bg-[#1d4ed8] px-3 text-sm font-medium text-white hover:bg-[#1e40af]"
              onClick={() => setDraft(emptyDraft(sector.slug))}
            >
              <Plus className="mr-1 h-4 w-4" /> Novo card
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="flex h-9 items-center rounded-md bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              onClick={() => void runDistribution(0, false)}
              disabled={suggesting}
            >
              {suggesting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Sugerir distribuição
            </button>
          )}
          <button
            type="button"
            className="flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-1 h-4 w-4" /> Histórico
          </button>
          {access.canManage && (
            <>
              <button
                type="button"
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setClientsOpen(true)}
              >
                Clientes
              </button>
              <button
                type="button"
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => void duplicatePrevious()}
              >
                Duplicar semana anterior
              </button>
              <Link
                href="/equipe"
                className="flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Users className="mr-1 h-4 w-4" /> Acessos
              </Link>
              <button
                type="button"
                aria-label="Configurações da equipe e capacidade"
                title="Configurações da equipe e capacidade"
                className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </button>
            </>
          )}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={(event) => void onDragEnd(event)}
      >
      <div className="flex w-full flex-col gap-4 px-3 py-4 sm:px-4 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-[clamp(14rem,16vw,20rem)]">
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">
              Demandas não alocadas
            </h2>
            <p className="mb-2 text-xs font-medium text-amber-700">
              {(grouped.get(BACKLOG) ?? []).length} card(s)
            </p>
            <PlanColumn
              id={BACKLOG}
              cards={grouped.get(BACKLOG) ?? []}
              members={members}
                kinds={config.kinds}
                canEdit={canEdit}
                onEdit={(card) => setDraft(cardToDraft(card))}
                onDuplicate={duplicate}
                onToggleComplete={toggleComplete}
            />
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
                      {access.canManage ? (
                        <button
                          type="button"
                          aria-label={dayBlocked ? `Desbloquear ${day.label}` : `Bloquear ${day.label}`}
                          title={dayBlocked ? "Desbloquear o dia" : "Bloquear o dia (feriado)"}
                          className="rounded-md p-1 hover:bg-white/10"
                          onClick={() => void toggleBlock(day.value, null)}
                        >
                          {dayBlocked ? (
                            <Unlock className="h-4 w-4 text-white" />
                          ) : (
                            <Lock className="h-4 w-4 text-white/70" />
                          )}
                        </button>
                      ) : (
                        <Lock className="h-4 w-4 text-white/70" aria-hidden />
                      )}
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
                        const incoming =
                          activeCard && overContainer === key && containerOf(activeCard.id) !== key
                            ? activeCard.durationHours
                            : 0;
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
                              {access.canManage ? (
                                <button
                                  type="button"
                                  aria-label={
                                    memberBlocked
                                      ? `Desbloquear ${member.name} em ${day.label}`
                                      : `Bloquear ${member.name} em ${day.label}`
                                  }
                                  className="text-slate-400 hover:text-rose-600"
                                  onClick={() => void toggleBlock(day.value, member.id)}
                                  title="Bloquear profissional neste dia"
                                >
                                  {memberBlocked ? (
                                    <Unlock className="h-3.5 w-3.5 text-rose-600" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                              )}
                            </div>
                            <PlanColumn
                              id={key}
                              cards={list}
                              members={members}
                kinds={config.kinds}
                canEdit={canEdit}
                onEdit={(card) => setDraft(cardToDraft(card))}
                onDuplicate={duplicate}
                onToggleComplete={toggleComplete}
                            />
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
                              {incoming > 0 && (
                                <p
                                  className={
                                    used + incoming > capacity
                                      ? "font-semibold text-rose-600"
                                      : "font-semibold text-blue-700"
                                  }
                                >
                                  Ao soltar: {formatHours(used + incoming)} / {formatHours(capacity)}
                                </p>
                              )}
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

      <DragOverlay>
        {activeCard ? <PlanCardView card={activeCard} kinds={config.kinds} dragging /> : null}
      </DragOverlay>
      </DndContext>

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

      {draft && (
        <CardDialog
          draft={draft}
          sector={sector.slug}
          members={members}
          clients={data.clients}
          presets={data.presets}
          saving={saving}
          canDelete={access.canManage}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={() => void saveDraft()}
          onDelete={() => {
            const card = cards.find((c) => c.id === draft.id);
            if (!card) return;
            setDraft(null);
            void remove(card);
          }}
          onMove={() => {
            const card = cards.find((c) => c.id === draft.id);
            if (!card) return;
            setDraft(null);
            setMoving(card);
          }}
        />
      )}
      {moving && (
        <MoveCardDialog
          card={moving}
          members={members}
          overrides={overrides}
          blocks={blocks}
          cards={cards}
          isAbsent={isAbsent}
          onConfirm={(dateKey, memberId) => moveTo(moving, dateKey, memberId)}
          onClose={() => setMoving(null)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          slug={sector.slug}
          members={members}
          overrides={overrides}
          week={week}
          onClose={() => setSettingsOpen(false)}
          onChanged={() => router.refresh()}
        />
      )}
      {clientsOpen && (
        <ClientsDialog
          slug={sector.slug}
          week={week}
          clients={data.clients}
          members={members}
          presets={data.presets}
          onClose={() => setClientsOpen(false)}
          onChanged={() => router.refresh()}
        />
      )}
      {distribution && (
        <DistributionDialog
          data={distribution}
          members={members}
          busy={suggesting}
          onVariant={() => void runDistribution(distribution.variant + 1, distribution.relaxed)}
          onRelax={() => void runDistribution(0, true)}
          onApply={() => void applyDistribution()}
          onClose={() => setDistribution(null)}
        />
      )}
      {historyOpen && (
        <HistoryDialog slug={sector.slug} week={week} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
