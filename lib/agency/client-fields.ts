import { z } from "zod";

/** CEP fica só com dígitos; 8 dígitos ou nulo. */
export function normalizeZip(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

export function formatZip(value?: string | null) {
  if (!value || value.length !== 8) return value ?? "";
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

/** Aceita apenas link do Google Drive/Docs, para não virar campo de texto livre. */
export function isDriveUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname === "drive.google.com" ||
      url.hostname === "docs.google.com"
    );
  } catch {
    return false;
  }
}

export function formatAddress(client: {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
}) {
  const line1 = [client.addressStreet, client.addressNumber]
    .filter(Boolean)
    .join(", ");
  const line2 = [client.addressComplement, client.addressDistrict]
    .filter(Boolean)
    .join(" - ");
  const line3 = [client.addressCity, client.addressState]
    .filter(Boolean)
    .join("/");
  const zip = client.addressZip ? formatZip(client.addressZip) : "";
  return [line1, line2, line3, zip].filter(Boolean).join(" · ");
}

export function formatBirthDate(value?: Date | string | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

const optionalText = z
  .string()
  .trim()
  .max(180)
  .optional()
  .transform((v) => (v ? v : null));

const optionalDriveUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isDriveUrl(v), {
    message: "Informe um link do Google Drive ou Google Docs.",
  });

export const clientProfileSchema = z.object({
  birthDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
      message: "Data inválida.",
    }),
  addressZip: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizeZip(v) : null))
    .refine((v) => v === null || v.length === 8, { message: "CEP inválido." }),
  addressStreet: optionalText,
  addressNumber: optionalText,
  addressComplement: optionalText,
  addressDistrict: optionalText,
  addressCity: optionalText,
  addressState: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null))
    .refine((v) => v === null || v.length === 2, {
      message: "Use a sigla do estado (2 letras).",
    }),
  contractDocUrl: optionalDriveUrl,
  studyDocUrl: optionalDriveUrl,
});

export type ClientProfileInput = z.input<typeof clientProfileSchema>;
export type ClientProfileData = z.output<typeof clientProfileSchema>;
