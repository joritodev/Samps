import { AssignmentStatus, DemandStatus } from "@prisma/client";
import { canDemandBriefing } from "./labels";
import { videoDemoMissingFields } from "./video-demo-briefing";

export type DemandCycleAssignmentHint = {
  assigneeId?: string | null;
};

/** Coluna operacional do cartão — a mesma que as actions gravam. */
export function boardColumnForDemandStatus(
  status: DemandStatus,
  extras?: DemandCycleAssignmentHint
): string {
  switch (status) {
    case DemandStatus.PENDING_PLANNING:
    case DemandStatus.PLANNING:
    case DemandStatus.BACKLOG:
    case DemandStatus.OPEN:
      return "todo";
    case DemandStatus.DEMANDED:
    case DemandStatus.AVAILABLE:
      return extras?.assigneeId ? "assigned" : "available";
    case DemandStatus.IN_PRODUCTION:
      return "production";
    case DemandStatus.IN_REVIEW:
    case DemandStatus.APPROVED:
    case DemandStatus.SCHEDULED:
      return "review";
    case DemandStatus.ADJUSTMENTS:
      return "adjustments";
    case DemandStatus.PUBLISHED:
    case DemandStatus.DONE:
    case DemandStatus.DELIVERED:
    case DemandStatus.CANCELLED:
      return "done";
    default:
      return "todo";
  }
}

export function internalStatusForDemandStatus(
  status: DemandStatus,
  extras?: DemandCycleAssignmentHint
): string {
  switch (status) {
    case DemandStatus.PENDING_PLANNING:
    case DemandStatus.PLANNING:
    case DemandStatus.BACKLOG:
    case DemandStatus.OPEN:
      return "Pendente de planejamento";
    case DemandStatus.DEMANDED:
    case DemandStatus.AVAILABLE:
      return extras?.assigneeId ? "Atribuída" : "Disponível no setor";
    case DemandStatus.IN_PRODUCTION:
      return "Em produção";
    case DemandStatus.IN_REVIEW:
      return "Aguardando revisão";
    case DemandStatus.ADJUSTMENTS:
      return "Ajuste solicitado";
    case DemandStatus.APPROVED:
    case DemandStatus.SCHEDULED:
      return "Aprovado — aguardando publicação";
    case DemandStatus.PUBLISHED:
    case DemandStatus.DONE:
    case DemandStatus.DELIVERED:
      return "Publicado";
    default:
      return status;
  }
}

export function assignmentStatusForDemandStatus(
  status: DemandStatus,
  extras?: DemandCycleAssignmentHint
): AssignmentStatus | null {
  switch (status) {
    case DemandStatus.DEMANDED:
    case DemandStatus.AVAILABLE:
      return extras?.assigneeId
        ? AssignmentStatus.ASSIGNED
        : AssignmentStatus.AVAILABLE;
    case DemandStatus.IN_PRODUCTION:
      return AssignmentStatus.IN_PROGRESS;
    case DemandStatus.IN_REVIEW:
    case DemandStatus.APPROVED:
    case DemandStatus.SCHEDULED:
      return AssignmentStatus.IN_REVIEW;
    case DemandStatus.ADJUSTMENTS:
      return AssignmentStatus.ADJUSTMENT;
    case DemandStatus.DONE:
    case DemandStatus.PUBLISHED:
    case DemandStatus.DELIVERED:
      return AssignmentStatus.DONE;
    default:
      return null;
  }
}

export type DemandCycleSnapshot = {
  status: DemandStatus;
  boardColumn: string;
  title: string;
  briefingLockedAt?: Date | string | null;
  description?: string | null;
  format?: string | null;
  orientation?: string | null;
  durationSeconds?: number | null;
  demandType?: string | null;
  contentTypeSlug?: string | null;
  sectorId?: string | null;
  assigneeId?: string | null;
  materialUrl?: string | null;
  publishedUrl?: string | null;
  visibleToClient?: boolean;
};

const NEEDS_MATERIAL: DemandStatus[] = [
  DemandStatus.IN_REVIEW,
  DemandStatus.ADJUSTMENTS,
  DemandStatus.APPROVED,
  DemandStatus.SCHEDULED,
  DemandStatus.PUBLISHED,
  DemandStatus.DONE,
  DemandStatus.DELIVERED,
];

const NEEDS_EXECUTOR: DemandStatus[] = [
  DemandStatus.IN_PRODUCTION,
  DemandStatus.IN_REVIEW,
  DemandStatus.ADJUSTMENTS,
  DemandStatus.APPROVED,
  DemandStatus.SCHEDULED,
  DemandStatus.PUBLISHED,
  DemandStatus.DONE,
];

const CLIENT_VISIBLE: DemandStatus[] = [
  DemandStatus.APPROVED,
  DemandStatus.SCHEDULED,
  DemandStatus.PUBLISHED,
  DemandStatus.DONE,
  DemandStatus.DELIVERED,
];

/** Invariantes do ciclo vivo — usado pelo seed e pelos testes. */
export function demandCycleViolations(d: DemandCycleSnapshot): string[] {
  const gaps: string[] = [];
  const hint = { assigneeId: d.assigneeId };
  const expectedCol = boardColumnForDemandStatus(d.status, hint);
  if (d.boardColumn !== expectedCol) {
    gaps.push(`boardColumn esperado ${expectedCol}, veio ${d.boardColumn}`);
  }

  const stillPlanning = canDemandBriefing(d.status, d.briefingLockedAt);

  if (stillPlanning) {
    if (d.briefingLockedAt) {
      gaps.push("briefing não deveria estar travado em planejamento");
    }
  } else {
    if (!d.briefingLockedAt) gaps.push("briefing deveria estar travado");
    if (!d.sectorId) gaps.push("setor obrigatório após demandar");
    if (!d.description?.trim()) gaps.push("descrição obrigatória após demandar");
    gaps.push(
      ...videoDemoMissingFields({
        contentTypeSlug: d.contentTypeSlug,
        demandType: d.demandType,
        durationSeconds: d.durationSeconds,
        format: d.format,
        orientation: d.orientation,
      }).map((field) => `vídeo: ${field}`)
    );
  }

  if (NEEDS_EXECUTOR.includes(d.status) && !d.assigneeId) {
    gaps.push("executor/assignee obrigatório neste status");
  }
  if (NEEDS_MATERIAL.includes(d.status) && !d.materialUrl?.trim()) {
    gaps.push("materialUrl obrigatório a partir da revisão");
  }
  if (d.status === DemandStatus.PUBLISHED && !d.publishedUrl?.trim()) {
    gaps.push("publishedUrl obrigatório em publicada");
  }
  if (CLIENT_VISIBLE.includes(d.status) && !d.visibleToClient) {
    gaps.push("conteúdo aprovado/publicado deve ser visível ao cliente");
  }

  return gaps;
}
