import { createHash } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Regra de senha do servidor (os formulários só repetem a mesma regra). Devolve a mensagem de erro ou `null`. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa de ao menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/** O banco guarda só o hash do token de redefinição: quem lê a tabela não consegue usar o link. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Pedidos de redefinição aceitos por e-mail dentro da janela (evita enxurrada de e-mails). */
export const RESET_REQUEST_LIMIT = 3;
export const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
