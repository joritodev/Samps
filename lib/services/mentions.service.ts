import { NotificationType, UserStatus, UserType } from "@prisma/client";
import { extractMentionTokens } from "@/lib/agency/mention-parser";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services/notifications.service";

const COMMENT_PREVIEW_MAX = 140;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function truncateCommentPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= COMMENT_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, COMMENT_PREVIEW_MAX).trimEnd()}…`;
}

export function resolveMentionedUserIds(
  tokens: string[],
  candidates: { id: string; name: string }[],
  excludeUserId?: string
): string[] {
  const idByName = new Map<string, string>();
  for (const candidate of candidates) {
    const key = normalizeName(candidate.name);
    if (!key || idByName.has(key)) continue;
    idByName.set(key, candidate.id);
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const id = idByName.get(normalizeName(token));
    if (!id || id === excludeUserId || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export async function notifyCommentMentions(params: {
  text: string;
  authorUserId: string;
  authorName: string;
  demandTitle: string;
  clientId?: string;
  demandId: string;
}): Promise<void> {
  const tokens = extractMentionTokens(params.text);
  if (tokens.length === 0) return;

  const candidates = await db.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      userType: { not: UserType.EXTERNAL_CLIENT },
    },
    select: { id: true, name: true },
  });

  const userIds = resolveMentionedUserIds(
    tokens,
    candidates,
    params.authorUserId
  );
  if (userIds.length === 0) return;

  const link = params.clientId
    ? `/clientes/${params.clientId}/quadro`
    : "/notificacoes";
  const message = truncateCommentPreview(params.text);

  for (const userId of userIds) {
    await createNotification({
      userId,
      type: NotificationType.NEW_COMMENT,
      title: "Você foi mencionado",
      message,
      link,
    });
  }
}
