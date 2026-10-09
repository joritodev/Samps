import { notFound } from "next/navigation";
import { PlanningBoard } from "@/components/planning/planning-board";
import { dayKey } from "@/lib/agency/sp-calendar";
import { currentWeekFromDayKey, parseWeekParam } from "@/lib/agency/planning/board";
import { isPlanSectorSlug } from "@/lib/agency/planning/config";
import { requirePermission } from "@/lib/permissions/check";
import { getPlanningBoard } from "@/lib/services/planning.service";

export const metadata = { title: "Planejamento semanal" };

export default async function PlanningSectorPage({
  params,
  searchParams,
}: {
  params: { setor: string };
  searchParams: { semana?: string };
}) {
  const user = await requirePermission("planning.view");
  if (!isPlanSectorSlug(params.setor)) notFound();

  const todayWeek = currentWeekFromDayKey(dayKey(new Date()));
  const week = parseWeekParam(searchParams.semana) ?? todayWeek;
  const data = await getPlanningBoard(user, params.setor, week);
  if (!data) notFound();

  return (
    <PlanningBoard
      key={`${data.sector.slug}-${week.year}-${week.week}`}
      data={data}
      todayWeek={todayWeek}
    />
  );
}
