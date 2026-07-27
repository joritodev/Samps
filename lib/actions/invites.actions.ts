"use server";

import { AuditAction, UserStatus, UserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/credentials";
import { db } from "@/lib/db";
import { appUrl, emailLayout, sendEmail } from "@/lib/mail/send";
import { requirePermission } from "@/lib/permissions/check";
import { logAudit } from "@/lib/services/audit.service";
import {
  acceptInvite,
  findInviteByToken,
  inviteExpiry,
  inviteState,
  newInviteToken,
} from "@/lib/services/invites.service";
import { completeFirstAccess } from "@/lib/services/users.service";

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  userType: z.nativeEnum(UserType),
  roleId: z.string().min(1, "Selecione uma função."),
  sectorId: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
});

async function deliverInvite(input: {
  to: string;
  name: string;
  token: string;
  invitedBy: string;
}) {
  const link = appUrl(`/convite/${input.token}`);
  await sendEmail({
    to: input.to,
    subject: "Seu acesso à Samps Digital",
    html: emailLayout({
      title: "Você foi convidado",
      intro: `Olá, ${input.name}. ${input.invitedBy} criou um acesso para você na Samps Digital. Use o link abaixo para definir sua senha — ele vale por 7 dias.`,
      ctaLabel: "Ativar meu acesso",
      ctaUrl: link,
    }),
    fallbackLog: `Link de convite: ${link}`,
  });

  return link;
}

export async function inviteUser(input: {
  name: string;
  email: string;
  userType: UserType;
  roleId: string;
  sectorId?: string;
  clientIds?: string[];
}) {
  const actor = await requirePermission("users.create");
  const parsed = inviteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const data = parsed.data;

  if (await db.user.findUnique({ where: { email: data.email } })) {
    return { ok: false as const, error: "Já existe um usuário com esse e-mail." };
  }

  const token = newInviteToken();

  // Senha aleatória descartável: o acesso só é possível pelo link do convite.
  const passwordHash = await hashPassword(newInviteToken());

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      userType: data.userType,
      roleId: data.roleId,
      sectorId: data.sectorId || undefined,
      status: UserStatus.INVITE_PENDING,
      mustResetPassword: true,
      clientLinks: data.clientIds?.length
        ? { create: data.clientIds.map((clientId) => ({ clientId })) }
        : undefined,
      invitesReceived: {
        create: {
          email: data.email,
          token,
          expiresAt: inviteExpiry(),
          invitedById: actor.id,
        },
      },
    },
  });

  await logAudit({
    userId: actor.id,
    action: AuditAction.USER_CREATED,
    entityType: "User",
    entityId: user.id,
    newValue: {
      email: user.email,
      userType: user.userType,
      roleId: user.roleId,
      invited: true,
    },
    origin: "equipe/convites",
  });

  const link = await deliverInvite({
    to: user.email,
    name: user.name,
    token,
    invitedBy: actor.name,
  });

  revalidatePath("/equipe");

  return { ok: true as const, link };
}

export async function resendInvite(inviteId: string) {
  const actor = await requirePermission("users.create");

  const invite = await db.userInvite.findUnique({
    where: { id: inviteId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!invite?.user) {
    return { ok: false as const, error: "Convite não encontrado." };
  }
  if (invite.acceptedAt) {
    return { ok: false as const, error: "Este convite já foi aceito." };
  }

  const token = newInviteToken();
  await db.userInvite.update({
    where: { id: invite.id },
    data: { token, expiresAt: inviteExpiry() },
  });

  const link = await deliverInvite({
    to: invite.user.email,
    name: invite.user.name,
    token,
    invitedBy: actor.name,
  });

  revalidatePath("/equipe");

  return { ok: true as const, link };
}

export async function revokeInvite(inviteId: string) {
  const actor = await requirePermission("users.deactivate");

  const invite = await db.userInvite.findUnique({
    where: { id: inviteId },
    include: { user: { select: { id: true, email: true, status: true } } },
  });

  if (!invite?.user) {
    return { ok: false as const, error: "Convite não encontrado." };
  }
  if (invite.acceptedAt) {
    return {
      ok: false as const,
      error: "Convite já aceito — desative o usuário em vez de revogar.",
    };
  }

  // Desliga o convite do usuário e bloqueia a conta que nunca foi ativada.
  await db.$transaction([
    db.userInvite.update({
      where: { id: invite.id },
      data: { userId: null },
    }),
    db.user.update({
      where: { id: invite.user.id },
      data: { status: UserStatus.INACTIVE },
    }),
  ]);

  await logAudit({
    userId: actor.id,
    action: AuditAction.ACCESS_REVOKED,
    entityType: "User",
    entityId: invite.user.id,
    previousValue: { status: invite.user.status },
    newValue: { status: UserStatus.INACTIVE, inviteRevoked: true },
    origin: "equipe/convites",
  });

  revalidatePath("/equipe");

  return { ok: true as const };
}

const acceptSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo."),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres."),
  phone: z.string().trim().optional(),
  termsAccepted: z
    .boolean()
    .refine((accepted) => accepted, "É preciso aceitar os termos."),
});

/**
 * Aceite público: o usuário é resolvido pelo token, nunca por um id vindo do
 * cliente — caso contrário qualquer visitante trocaria a senha de terceiros.
 */
export async function acceptInviteAndSetPassword(
  token: string,
  input: {
    name: string;
    password: string;
    phone?: string;
    termsAccepted: boolean;
  }
) {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const invite = await findInviteByToken(token);
  if (inviteState(invite) !== "valid" || !invite?.userId) {
    return { ok: false as const, error: "Convite inválido ou expirado." };
  }

  await completeFirstAccess(invite.userId, parsed.data);
  await acceptInvite(invite.id, invite.userId);

  await logAudit({
    userId: invite.userId,
    action: AuditAction.USER_UPDATED,
    entityType: "User",
    entityId: invite.userId,
    newValue: { inviteAccepted: true },
    origin: "convite",
  });

  return { ok: true as const, email: invite.user?.email ?? invite.email };
}
