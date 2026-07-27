import {
  AssignmentStatus,
  AuditAction,
  DemandStatus,
  WorkSessionStage,
  WorkSessionStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { getActiveAssignment } from "@/lib/services/assignment.service";
import { recalculateSectorPriorities } from "@/lib/services/priority.service";
import type { SessionUser } from "@/types/auth";
import { PAUSE_REASONS } from "@/lib/constants/work-session";

export { PAUSE_REASONS };

function elapsedSeconds(startedAt: Date, totalActiveSeconds: number, status: WorkSessionStatus) {
  if (status !== WorkSessionStatus.ACTIVE) return totalActiveSeconds;
  return totalActiveSeconds + Math.floor((Date.now() - startedAt.getTime()) / 1000);
}

export async function getActiveSessionForUser(userId: string) {
  return db.workSession.findFirst({
    where: {
      userId,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    },
    include: { demand: { select: { id: true, title: true } }, pauses: true },
  });
}

export async function getActiveSessionForDemand(demandId: string) {
  return db.workSession.findFirst({
    where: {
      demandId,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      pauses: { where: { endedAt: null } },
    },
  });
}

export async function startWorkSession(
  demandId: string,
  user: SessionUser,
  stage: WorkSessionStage = WorkSessionStage.PRODUCTION
) {
  const existing = await getActiveSessionForUser(user.id);
  if (existing) {
    throw new Error(
      "Você já possui uma atividade em andamento. Pause ou finalize a atividade atual antes de iniciar outra."
    );
  }

  const assignment = await getActiveAssignment(demandId);
  if (!assignment || assignment.executorId !== user.id) {
    throw new Error("Assuma a demanda antes de iniciar");
  }

  const session = await db.workSession.create({
    data: {
      demandId,
      userId: user.id,
      stage,
      status: WorkSessionStatus.ACTIVE,
      startedAt: new Date(),
    },
  });

  await db.demandAssignment.update({
    where: { id: assignment.id },
    data: { status: AssignmentStatus.IN_PROGRESS },
  });

  await db.demand.update({
    where: { id: demandId },
    data: {
      status: DemandStatus.IN_PRODUCTION,
      internalStatus: "Em produção",
      boardColumn: "production",
      productionStartedAt: new Date(),
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.WORK_SESSION_STARTED,
    entityType: "WorkSession",
    entityId: session.id,
    newValue: { demandId, stage },
  });

  if (assignment.sectorId) {
    await recalculateSectorPriorities(assignment.sectorId);
  }

  return session;
}

export async function pauseWorkSession(
  sessionId: string,
  user: SessionUser,
  reason: string,
  description?: string
) {
  if (!reason) throw new Error("Motivo da pausa é obrigatório");
  if (reason === "Outro" && !description?.trim()) {
    throw new Error("Justificativa obrigatória quando o motivo for Outro");
  }

  const session = await db.workSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) throw new Error("Sessão não encontrada");
  if (session.status !== WorkSessionStatus.ACTIVE) throw new Error("Sessão não está ativa");

  const added = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  const totalActiveSeconds = session.totalActiveSeconds + Math.max(0, added);

  await db.workPause.create({
    data: { sessionId, reason, description },
  });

  const updated = await db.workSession.update({
    where: { id: sessionId },
    data: {
      status: WorkSessionStatus.PAUSED,
      totalActiveSeconds,
      startedAt: new Date(),
    },
  });

  await db.demand.update({
    where: { id: session.demandId },
    data: { internalStatus: "Pausada" },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.WORK_SESSION_PAUSED,
    entityType: "WorkSession",
    entityId: sessionId,
    newValue: { reason, description },
  });

  return updated;
}

export async function resumeWorkSession(sessionId: string, user: SessionUser) {
  const session = await db.workSession.findUnique({
    where: { id: sessionId },
    include: { pauses: { where: { endedAt: null } } },
  });
  if (!session || session.userId !== user.id) throw new Error("Sessão não encontrada");
  if (session.status !== WorkSessionStatus.PAUSED) throw new Error("Sessão não está pausada");

  const other = await getActiveSessionForUser(user.id);
  if (other && other.id !== sessionId && other.status === WorkSessionStatus.ACTIVE) {
    throw new Error(
      "Você já possui uma atividade em andamento. Pause ou finalize a atividade atual antes de iniciar outra."
    );
  }

  for (const pause of session.pauses) {
    await db.workPause.update({
      where: { id: pause.id },
      data: { endedAt: new Date() },
    });
  }

  const updated = await db.workSession.update({
    where: { id: sessionId },
    data: {
      status: WorkSessionStatus.ACTIVE,
      startedAt: new Date(),
    },
  });

  await db.demand.update({
    where: { id: session.demandId },
    data: { internalStatus: "Em produção" },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.WORK_SESSION_RESUMED,
    entityType: "WorkSession",
    entityId: sessionId,
  });

  return updated;
}

export async function completeWorkSession(
  demandId: string,
  user: SessionUser,
  materialUrl: string
) {
  if (!materialUrl?.trim()) throw new Error("Link do material é obrigatório");

  const session = await db.workSession.findFirst({
    where: {
      demandId,
      userId: user.id,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    },
  });

  let totalActiveSeconds = 0;
  if (session) {
    if (session.status === WorkSessionStatus.ACTIVE) {
      totalActiveSeconds =
        session.totalActiveSeconds +
        Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    } else {
      totalActiveSeconds = session.totalActiveSeconds;
    }

    await db.workSession.update({
      where: { id: session.id },
      data: {
        status: WorkSessionStatus.COMPLETED,
        endedAt: new Date(),
        totalActiveSeconds,
      },
    });

    await logAudit({
      userId: user.id,
      action: AuditAction.WORK_SESSION_COMPLETED,
      entityType: "WorkSession",
      entityId: session.id,
      newValue: { totalActiveSeconds, materialUrl },
    });
  }

  const assignment = await getActiveAssignment(demandId);
  if (assignment) {
    await db.demandAssignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.IN_REVIEW },
    });
  }

  const updated = await db.demand.update({
    where: { id: demandId },
    data: {
      materialUrl,
      productionCompletedAt: new Date(),
      status: DemandStatus.IN_REVIEW,
      internalStatus: "Aguardando revisão",
      boardColumn: "review",
      assigneeId: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.PRODUCTION_COMPLETED,
    entityType: "Demand",
    entityId: demandId,
    newValue: { materialUrl, totalActiveSeconds },
  });

  if (assignment?.sectorId) {
    await recalculateSectorPriorities(assignment.sectorId);
  }

  return updated;
}

export function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

export async function getSessionPreview(demandId: string) {
  const session = await getActiveSessionForDemand(demandId);
  if (!session) return null;
  const seconds = elapsedSeconds(session.startedAt, session.totalActiveSeconds, session.status);
  return {
    sessionId: session.id,
    status: session.status,
    startedAt: session.startedAt,
    executor: session.user,
    elapsedSeconds: seconds,
    elapsedLabel: formatElapsed(seconds),
  };
}
