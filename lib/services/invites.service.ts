import { randomBytes } from "crypto";
import { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const INVITE_TTL_DAYS = 7;

export function newInviteToken() {
  return randomBytes(32).toString("hex");
}

export function inviteExpiry() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function listInvites() {
  return db.userInvite.findMany({
    include: {
      invitedBy: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          userType: true,
          role: { select: { name: true } },
          sector: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findInviteByToken(token: string) {
  return db.userInvite.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
    },
  });
}

export type InviteState =
  | "valid"
  | "not_found"
  | "accepted"
  | "expired"
  | "revoked";

export function inviteState(invite: {
  acceptedAt: Date | null;
  expiresAt: Date;
  userId: string | null;
} | null): InviteState {
  if (!invite) return "not_found";
  if (invite.acceptedAt) return "accepted";
  // O convite aponta para o usuário que ele cria; sem ele, foi revogado.
  if (!invite.userId) return "revoked";
  if (invite.expiresAt < new Date()) return "expired";
  return "valid";
}

/** Marca o convite como aceito e libera a conta para o primeiro acesso. */
export async function acceptInvite(inviteId: string, userId: string) {
  const [invite] = await db.$transaction([
    db.userInvite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
    }),
    db.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    }),
  ]);

  return invite;
}
