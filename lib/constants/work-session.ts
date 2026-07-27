export const PAUSE_REASONS = [
  "Intervalo",
  "Reunião",
  "Aguardando material",
  "Aguardando retorno",
  "Problema técnico",
  "Mudança de prioridade",
  "Interrupção da gestão",
  "Outro",
] as const;

export type PauseReason = (typeof PAUSE_REASONS)[number];
