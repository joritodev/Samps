import { DESIGN_TIME_DEFAULTS, designMinutes } from "./config";

export type DesignCalcInput = {
  kind: string;
  quantity: number;
  /** "Sem identidade visual" soma o adicional. */
  noIdentity: boolean;
  /** Só vale para "Vídeo com template": cria o template antes. */
  newTemplate: boolean;
};

export type DesignCalcResult = {
  totalMinutes: number;
  hours: number;
  /** Ex.: "3 slides × 15 min + 90 min (identidade)". */
  summary: string;
  unit: string | null;
};

/** Calculadora de tempo do Design. Devolve null para tipos sem tempo-padrão (ex.: reunião). */
export function computeDesignTime(
  input: DesignCalcInput,
  presets: { label: string; hours: number }[],
): DesignCalcResult | null {
  const def = DESIGN_TIME_DEFAULTS.find((d) => d.key === input.kind);
  const unitMin = designMinutes(input.kind, presets);
  if (!def || unitMin === null) return null;

  const extraIdentity = designMinutes("sem_identidade", presets) ?? 90;
  const extraTemplate = designMinutes("template_video", presets) ?? 20;
  const quantity = def.unit ? Math.max(1, Math.floor(input.quantity) || 1) : 1;
  const withTemplate = input.kind === "video_template" && input.newTemplate;

  const totalMinutes =
    quantity * unitMin + (input.noIdentity ? extraIdentity : 0) + (withTemplate ? extraTemplate : 0);
  const summary = [
    def.unit ? `${quantity} ${def.unit} × ${unitMin} min` : `${unitMin} min`,
    input.noIdentity ? `+ ${extraIdentity} min (identidade)` : "",
    withTemplate ? `+ ${extraTemplate} min (template)` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    totalMinutes,
    hours: Math.round((totalMinutes / 60) * 10000) / 10000,
    summary,
    unit: def.unit ?? null,
  };
}
