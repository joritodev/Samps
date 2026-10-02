import type { SummaryScope } from "@/lib/services/performance-summary.service";
import { evaluateGoals, listGoalsForUser } from "@/lib/services/goals.service";
import { evaluateObjectives, listObjectivesForUser, objectiveViewer } from "@/lib/services/okr.service";
import type { SessionUser } from "@/types/auth";

/**
 * Metas vigentes que dizem respeito ao recorte da Visão geral: agência (sem
 * filtro de cliente), o setor filtrado (ou o da pessoa) e as da própria pessoa.
 */
export async function goalsForScope(user: SessionUser, scope: SummaryScope) {
  const rows = await listGoalsForUser(user, { onlyActive: true });
  const now = new Date();
  const relevant = rows.filter((g) => {
    if (g.startsOn > now || g.endsOn < now) return false;
    if (g.scope === "AGENCY") return !scope.clientId;
    if (g.scope === "SECTOR") return Boolean(scope.sectorId) && g.sectorId === scope.sectorId;
    return g.userId === user.id && scope.userId === user.id;
  });
  return evaluateGoals(relevant, now);
}

/** Objetivos da agência em andamento, para o painel executivo (sem filtro de cliente). */
export async function agencyObjectives(user: SessionUser, scope: SummaryScope) {
  if (scope.clientId || scope.sectorId || scope.userId) return [];
  const rows = await listObjectivesForUser(user, { period: "atual" });
  const agency = rows.filter((o) => o.scope === "AGENCY" && o.status === "ACTIVE");
  return evaluateObjectives(agency, objectiveViewer(user));
}
