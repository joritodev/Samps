/** Só `http` e `https`: `javascript:`, `data:` e afins nunca viram link. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Para `href`: devolve o endereço se for http(s); senão `undefined` (o link não clica). */
export function safeHref(value: string | null | undefined): string | undefined {
  return isHttpUrl(value) ? value!.trim() : undefined;
}

export const INVALID_URL_MESSAGE = "Informe um link válido, começando com http:// ou https://.";
