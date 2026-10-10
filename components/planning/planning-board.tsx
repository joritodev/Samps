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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const selectClass =
    "h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground shadow-xs hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cyan/25";
  const group = "flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-xs";

  return (
    <div className="-m-1 min-h-full pb-8 text-foreground sm:-m-2">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex w-full flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
          <div className="mr-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-ink">
              Samps Digital
            </p>
            <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {config.title}
            </h1>
          </div>
          <nav className={group} aria-label="Setor">
            {(["video", "design"] as const).map((tab) => (
              <Link
                key={tab}
                href={`/planejamento-semanal/${tab}${sectorQuery}`}
                aria-current={sector.slug === tab ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sector.slug === tab
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                )}
              >
                {PLAN_SECTOR_CONFIG[tab].label}
              </Link>
            ))}
          </nav>
          <div className={group}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Semana anterior"
              onClick={() => goToWeek(shiftWeek(week, -1))}
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 text-sm font-medium tabular-nums text-foreground">
              {weekRangeLabel(week)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Próxima semana"
              onClick={() => goToWeek(shiftWeek(week, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => goToWeek(todayWeek)}>
            Semana atual
          </Button>
          <select
            aria-label="Semana"
            className={selectClass}
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
            className={selectClass}
            value={week.year}
            onChange={(e) => goToWeek({ year: Number(e.target.value), week: 1 })}
          >
            {[week.year - 1, week.year, week.year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className={group}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Reduzir zoom"
              aria-label="Reduzir zoom"
              onClick={() => changeColumnWidth(columnWidth - COL_WIDTH_STEP)}
              disabled={columnWidth <= COL_WIDTH_MIN}
            >
              <ZoomOut />
            </Button>
            <span className="w-12 text-center text-xs font-medium tabular-nums text-foreground">
              {zoomPercent(columnWidth)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
              onClick={() => changeColumnWidth(columnWidth + COL_WIDTH_STEP)}
              disabled={columnWidth >= COL_WIDTH_MAX}
            >
              <ZoomIn />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Ajustar para ver a semana inteira"
              onClick={fitWholeWeek}
            >
              <Maximize /> Semana inteira
            </Button>
          </div>
          {canEdit && (
            <Button type="button" onClick={() => setDraft(emptyDraft(sector.slug))}>
              <Plus /> Novo card
            </Button>
          )}
          {canEdit && (
            <Button
              type="button"
              variant="brand"
              onClick={() => void runDistribution(0, false)}
              disabled={suggesting}
            >
              {suggesting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Sugerir distribuição
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
            <History /> Histórico
          </Button>
          {access.canManage && (
            <>
              <Button type="button" variant="outline" onClick={() => setClientsOpen(true)}>
                Clientes
              </Button>
              <Button type="button" variant="outline" onClick={() => void duplicatePrevious()}>
                Duplicar semana anterior
              </Button>
              <Button asChild variant="outline">
                <Link href="/equipe">
                  <Users /> Acessos
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Configurações da equipe e capacidade"
                title="Configurações da equipe e capacidade"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings />
              </Button>
            </>
          )}
          {navigating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Carregando" />
          )}
        </div>
        {!access.canManage && (
          <p className="border-t border-border/60 bg-muted/50 px-4 py-1 text-center text-xs text-muted-foreground">
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
          <div className="rounded-xl border-2 border-warning/40 bg-warning/10 p-3 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-warning-ink">
              Demandas não alocadas
            </h2>
            <p className="mb-2 text-xs font-medium text-warning-ink">
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
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
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
                    className={`shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm ${
                      dayBlocked ? "border-destructive/30" : "border-border"
                    }`}
                  >
                    <div
                      className={`mb-2 flex items-center justify-between px-3 py-2 ${
                        dayBlocked
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide">
                          {day.short}
                        </p>
                        <p className="text-xs opacity-80">
                          {formatShortDate(dayDate(week, day.value))}
                        </p>
                      </div>
                      {access.canManage ? (
                        <button
                          type="button"
                          aria-label={dayBlocked ? `Desbloquear ${day.label}` : `Bloquear ${day.label}`}
                          title={dayBlocked ? "Desbloquear o dia" : "Bloquear o dia (feriado)"}
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() => void toggleBlock(day.value, null)}
                        >
                          {dayBlocked ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4 opacity-70" />
                          )}
                        </button>
                      ) : (
                        <Lock className="h-4 w-4 opacity-70" aria-hidden />
                      )}
                    </div>
                    {dayBlocked && (
                      <p className="mx-3 mb-2 rounded-md bg-destructive/10 px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-destructive">
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
                                ? "border-destructive/30 bg-destructive/10"
                                : free < 0
                                  ? "border-destructive/30 bg-destructive/5"
                                  : free === 0
                                    ? "border-success/30 bg-success/5"
                                    : "border-border bg-muted/50"
                            }`}
                            style={{ borderTop: `3px solid ${member.color}` }}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
                                <span
                                  aria-hidden
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: member.color }}
                                />
                                <span className="truncate">{member.name}</span>
                              </span>
                              {access.canManage ? (
                                <button
                                  type="button"
                                  aria-label={
                                    memberBlocked
                                      ? `Desbloquear ${member.name} em ${day.label}`
                                      : `Bloquear ${member.name} em ${day.label}`
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => void toggleBlock(day.value, member.id)}
                                  title="Bloquear profissional neste dia"
                                >
                                  {memberBlocked ? (
                                    <Unlock className="h-3.5 w-3.5 text-destructive" />
                                  ) : (
                                    <Lock className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
                            <div className="mt-2 border-t border-border pt-2 text-sm font-medium text-foreground/80">
                              <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${
                                    free < 0
                                      ? "bg-destructive"
                                      : fillPct >= 90
                                        ? "bg-success"
                                        : "bg-primary"
                                  }`}
                                  style={{ width: `${free < 0 ? 100 : fillPct}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                <p className="rounded bg-primary/10 px-2 py-1 text-primary-ink">
                                  Disponível: {formatHours(capacity)}
                                </p>
                                <p className="rounded bg-warning/15 px-2 py-1 text-warning-ink">
                                  Ocupado: {formatHours(used)}
                                </p>
                                {free >= 0 ? (
                                  <p className="rounded bg-success/10 px-2 py-1 font-semibold text-success-ink">
                                    Livre: {formatHours(free)}
                                  </p>
                                ) : (
                                  <p className="rounded bg-destructive/10 px-2 py-1 font-semibold text-destructive">
                                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                                    Sobrecarga de {formatHours(-free)}
                                  </p>
                                )}
                              </div>
                              {incoming > 0 && (
                                <p
                                  className={
                                    used + incoming > capacity
                                      ? "font-semibold text-destructive"
                                      : "font-semibold text-primary-ink"
                                  }
                                >
                                  Ao soltar: {formatHours(used + incoming)} / {formatHours(capacity)}
                                </p>
                              )}
                              {free > 0 && (
                                <p className="text-muted-foreground">
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
            <div key={row.member.id} className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.member.color }}
                />
                {row.member.name}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-semibold">
                <p className="rounded bg-primary/10 px-2 py-2 text-primary-ink">
                  Disponível
                  <br />
                  {formatHours(row.capacity)}
                </p>
                <p className="rounded bg-warning/15 px-2 py-2 text-warning-ink">
                  Ocupado
                  <br />
                  {formatHours(row.used)}
                </p>
                <p
                  className={`rounded px-2 py-2 ${
                    row.free >= 0 ? "bg-success/10 text-success-ink" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {row.free >= 0 ? "Livre" : "Sobrecarga"}
                  <br />
                  {formatHours(Math.abs(row.free))}
                </p>
              </div>
              <p className="mt-2 text-sm text-foreground/80">
                {config.itemLabel} programados: {row.items}
              </p>
            </div>
          ))}
          <div className="rounded-xl border border-primary/30 bg-primary p-4 text-primary-foreground shadow-sm">
            <p className="text-base font-semibold">Total da semana</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-semibold">
              <p className="rounded bg-primary-foreground/15 px-2 py-2">
                Disponível
                <br />
                {formatHours(totals.capacity)}
              </p>
              <p className="rounded bg-primary-foreground/15 px-2 py-2">
                Ocupado
                <br />
                {formatHours(totals.used)}
              </p>
              <p
                className={`rounded px-2 py-2 ${
                  totals.free >= 0
                    ? "bg-primary-foreground/15"
                    : "bg-destructive text-destructive-foreground"
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
