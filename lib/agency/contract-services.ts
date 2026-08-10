import { DemandType } from "@prisma/client";

export const CONTRACT_PERIODICITIES = [
  { value: "monthly", label: "Por mês" },
  { value: "weekly", label: "Por semana" },
  { value: "competence", label: "Por competência" },
  { value: "one_shot", label: "Pacote único" },
] as const;

export type ContractPeriodicity =
  (typeof CONTRACT_PERIODICITIES)[number]["value"];

export type ContentTypeOption = {
  id: string;
  name: string;
  slug: string;
};

export type ContractScopeLine = {
  contentTypeId: string;
  quantity: number;
  periodicity: ContractPeriodicity;
};

export function isContractPeriodicity(v: string): v is ContractPeriodicity {
  return CONTRACT_PERIODICITIES.some((p) => p.value === v);
}

export function periodicityLabel(periodicity: string) {
  return (
    CONTRACT_PERIODICITIES.find((p) => p.value === periodicity)?.label ??
    periodicity
  );
}

export function periodicitySuffix(periodicity: string) {
  switch (periodicity) {
    case "monthly":
      return " / mês";
    case "weekly":
      return " / semana";
    case "competence":
      return " / competência";
    case "one_shot":
      return " (pacote)";
    default:
      return "";
  }
}

export function demandTypeFromContentSlug(slug: string): DemandType {
  const key = slug.toLowerCase();
  if (key === "stories" || key === "story") return DemandType.STORY;
  if (key === "reels" || key === "reel") return DemandType.REEL;
  if (key === "estatico" || key === "carrossel" || key === "feed") {
    return DemandType.FEED;
  }
  if (key === "video" || key === "motion") return DemandType.VIDEO;
  return DemandType.OTHER;
}

export function normalizeScopeLines(
  lines: { contentTypeId: string; quantity: number; periodicity: string }[]
): ContractScopeLine[] {
  const out: ContractScopeLine[] = [];
  for (const line of lines) {
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty < 1) continue;
    if (!line.contentTypeId) continue;
    const periodicity = isContractPeriodicity(line.periodicity)
      ? line.periodicity
      : "monthly";
    out.push({
      contentTypeId: line.contentTypeId,
      quantity: Math.floor(qty),
      periodicity,
    });
  }
  return out;
}
