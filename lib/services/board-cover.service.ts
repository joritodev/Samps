import { AuditAction } from "@prisma/client";
import { db } from "@/lib/db";
import { parseAppearance, type BoardCoverImage } from "@/lib/board/appearance";
import type { NormalizedCrop } from "@/lib/board/cover-crop";
import {
  deleteImage,
  newImageKey,
  processCover,
  putImage,
} from "@/lib/storage/image-upload";
import { logAudit } from "@/lib/services/audit.service";

export const COVER_UPLOADS_PER_HOUR = 10;
const AUDIT_ORIGIN = "board/cover";

export class CoverError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

async function loadBoard(boardClientId: string) {
  const board = await db.clientBoard.findUnique({
    where: { clientId: boardClientId },
    select: { id: true, config: true },
  });
  if (!board) throw new CoverError("Quadro não encontrado.", 404);
  const current =
    board.config && typeof board.config === "object" && !Array.isArray(board.config)
      ? (board.config as Record<string, unknown>)
      : {};
  return { id: board.id, current };
}

async function saveCoverImage(
  boardId: string,
  current: Record<string, unknown>,
  coverImage: BoardCoverImage | null
) {
  const appearance = parseAppearance(current);
  await db.clientBoard.update({
    where: { id: boardId },
    data: {
      config: { ...current, appearance: { ...appearance, coverImage } },
    },
  });
}

async function assertUnderRateLimit(userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await db.auditLog.count({
    where: { userId, origin: AUDIT_ORIGIN, createdAt: { gte: since } },
  });
  if (count >= COVER_UPLOADS_PER_HOUR) {
    throw new CoverError("Muitos envios em pouco tempo. Tente de novo em instantes.", 429);
  }
}

export async function uploadBoardCover(input: {
  clientId: string;
  actorId: string;
  file: Buffer;
  crop: Partial<NormalizedCrop>;
}): Promise<BoardCoverImage> {
  await assertUnderRateLimit(input.actorId);
  const board = await loadBoard(input.clientId);

  let processed;
  try {
    processed = await processCover(input.file, input.crop);
  } catch (e) {
    throw new CoverError(e instanceof Error ? e.message : "Imagem inválida.");
  }

  const key = newImageKey("board-covers", board.id);
  const url = await putImage(key, processed.data);
  const next: BoardCoverImage = { url, w: processed.width, h: processed.height };
  const previous = parseAppearance(board.current).coverImage;

  try {
    await saveCoverImage(board.id, board.current, next);
  } catch (e) {
    await deleteImage(url);
    throw e;
  }
  if (previous) await deleteImage(previous.url);

  await logAudit({
    userId: input.actorId,
    action: AuditAction.OTHER,
    entityType: "ClientBoard",
    entityId: board.id,
    origin: AUDIT_ORIGIN,
    newValue: { action: "upload", w: next.w, h: next.h },
  });
  return next;
}

export async function removeBoardCover(input: { clientId: string; actorId: string }) {
  const board = await loadBoard(input.clientId);
  const previous = parseAppearance(board.current).coverImage;
  if (!previous) return;
  await saveCoverImage(board.id, board.current, null);
  await deleteImage(previous.url);
  await logAudit({
    userId: input.actorId,
    action: AuditAction.OTHER,
    entityType: "ClientBoard",
    entityId: board.id,
    origin: "board/cover-remove",
    newValue: { action: "remove" },
  });
}
