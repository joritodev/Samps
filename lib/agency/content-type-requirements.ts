export type ContentTypeRequirements = {
  requiresDuration: boolean;
  requiresFormat: boolean;
  requiresCaption: boolean;
  requiresReference: boolean;
  requiresRawDelivery: boolean;
};

export type BriefingInput = {
  durationSeconds?: number | null;
  format?: string | null;
  orientation?: string | null;
  caption?: string | null;
  reference?: string | null;
  rawDelivery?: boolean | null;
};

function blank(value: string | null | undefined) {
  return !value?.trim();
}

/** Retorna lista de labels dos campos que faltam. Vazio = válido. */
export function missingBriefingFields(
  requirements: ContentTypeRequirements,
  input: BriefingInput
): string[] {
  const missing: string[] = [];

  if (requirements.requiresDuration) {
    const seconds = input.durationSeconds;
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
      missing.push("duração (segundos)");
    }
  }

  if (
    requirements.requiresFormat &&
    blank(input.format) &&
    blank(input.orientation)
  ) {
    missing.push("formato/orientação");
  }

  if (requirements.requiresCaption && blank(input.caption)) {
    missing.push("legenda");
  }

  if (requirements.requiresReference && blank(input.reference)) {
    missing.push("referência");
  }

  if (requirements.requiresRawDelivery && input.rawDelivery !== true) {
    missing.push("entrega bruta");
  }

  return missing;
}
