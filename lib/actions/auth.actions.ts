"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/credentials";
import { requireAuth } from "@/lib/permissions/check";
import { completeFirstAccess } from "@/lib/services/users.service";
import { appUrl, emailLayout, sendEmail } from "@/lib/mail/send";

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  // Resposta idêntica para e-mail inexistente, para não revelar quem tem conta.
  if (!user) return { success: true };

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });

  const link = appUrl(`/reset-password/${token}`);
  await sendEmail({
    to: user.email,
    subject: "Redefinição de senha — Samps Digital",
    html: emailLayout({
      title: "Redefinir sua senha",
      intro: `Olá, ${user.name}. Recebemos um pedido para redefinir a sua senha. O link abaixo vale por 1 hora.`,
      ctaLabel: "Criar nova senha",
      ctaUrl: link,
    }),
    fallbackLog: `Link de redefinição: ${link}`,
  });

  return { success: true };
}

export async function resetPassword(token: string, password: string) {
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado." };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustResetPassword: false },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}

export async function submitFirstAccess(data: {
  name: string;
  password: string;
  phone?: string;
  termsAccepted: boolean;
}) {
  const user = await requireAuth();
  if (!user.mustResetPassword) {
    return { error: "Primeiro acesso já concluído." };
  }
  try {
    await completeFirstAccess(user.id, data);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao completar cadastro" };
  }
}
