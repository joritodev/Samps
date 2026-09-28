import { UserType, type AgendaMeetingKind } from "@prisma/client";
import { db } from "@/lib/db";
import {
  parseAgendaMeetingInput,
  type AgendaMeetingInput,
} from "@/lib/agency/agenda-meeting";
import type { SessionUser } from "@/types/auth";

function assertInternal(user: SessionUser) {
  if (user.userType === UserType.EXTERNAL_CLIENT) {
    throw new Error("Cliente externo não altera a agenda da equipe.");
  }
}

export async function listAgendaMeetings(from: Date, to: Date) {
  return db.agendaMeeting.findMany({
    where: { startsAt: { gte: from, lte: to } },
    include: { createdBy: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
}

export async function createAgendaMeeting(
  user: SessionUser,
  input: AgendaMeetingInput
) {
  assertInternal(user);
  const parsed = parseAgendaMeetingInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return db.agendaMeeting.create({
    data: {
      ...parsed.value,
      kind: parsed.value.kind as AgendaMeetingKind,
      createdById: user.id,
    },
  });
}

export async function updateAgendaMeeting(
  user: SessionUser,
  id: string,
  input: AgendaMeetingInput
) {
  assertInternal(user);
  const parsed = parseAgendaMeetingInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  const existing = await db.agendaMeeting.findUnique({ where: { id } });
  if (!existing) throw new Error("Reunião não encontrada.");
  return db.agendaMeeting.update({
    where: { id },
    data: {
      ...parsed.value,
      kind: parsed.value.kind as AgendaMeetingKind,
    },
  });
}

export async function deleteAgendaMeeting(user: SessionUser, id: string) {
  assertInternal(user);
  const existing = await db.agendaMeeting.findUnique({ where: { id } });
  if (!existing) throw new Error("Reunião não encontrada.");
  await db.agendaMeeting.delete({ where: { id } });
}
