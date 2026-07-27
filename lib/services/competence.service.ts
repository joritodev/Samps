import { CompetenceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { generateContractualCards } from "@/lib/services/board.service";

export async function getCompetences(boardId: string) {
  return db.competence.findMany({
    where: { boardId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getCompetenceById(id: string) {
  return db.competence.findUnique({ where: { id } });
}

export async function setCurrentCompetence(boardId: string, competenceId: string) {
  return db.clientBoard.update({
    where: { id: boardId },
    data: { currentCompetenceId: competenceId },
  });
}

export async function createNextCompetence(
  boardId: string,
  month: number,
  year: number,
  userId?: string
) {
  const board = await db.clientBoard.findUnique({
    where: { id: boardId },
    include: { contract: true },
  });
  if (!board?.contractId) throw new Error("Quadro sem contrato");

  const existing = await db.competence.findUnique({
    where: { boardId_month_year: { boardId, month, year } },
  });
  if (existing) throw new Error("Competência já existe");

  const competence = await db.competence.create({
    data: { boardId, month, year, status: CompetenceStatus.OPEN },
  });

  await db.clientBoard.update({
    where: { id: boardId },
    data: { currentCompetenceId: competence.id },
  });

  await generateContractualCards({
    boardId,
    clientId: board.clientId,
    competenceId: competence.id,
    contractId: board.contractId,
    month,
    userId,
  });

  return competence;
}

export function formatCompetenceLabel(month: number, year: number) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[month - 1]} de ${year}`;
}
