/** Tipos de domínio do planejamento semanal. Horas sempre em número (o serviço converte Decimal). */

export type PlanSectorSlug = "video" | "design";

export type PlanCardStatus =
  | "NAO_ALOCADO"
  | "PROGRAMADO"
  | "EM_EDICAO"
  | "REVISAO"
  | "CONCLUIDO";

export type IsoWeek = { year: number; week: number };

export type PlanMemberData = {
  id: string;
  userId: string;
  name: string;
  color: string;
  defaultCapacityHours: number;
  sortOrder: number;
  active: boolean;
};

export type PlanCardData = {
  id: string;
  isoYear: number;
  isoWeek: number;
  weekday: number | null;
  memberId: string | null;
  kind: string;
  clientId: string | null;
  clientName: string | null;
  demandId: string | null;
  templateId: string | null;
  title: string;
  category: string;
  durationHours: number;
  status: PlanCardStatus;
  pinned: boolean;
  required: boolean;
  recurring: boolean;
  /** AAAA-MM-DD */
  dueDate: string | null;
  notes: string | null;
  position: number;
};

export type PlanTemplateData = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  kind: string;
  category: string;
  durationHours: number;
  weeklyQuantity: number;
  preferredMemberId: string | null;
  preferredWeekday: number | null;
  required: boolean;
  active: boolean;
  sortOrder: number;
};

export type PlanDayBlockData = {
  id: string;
  isoYear: number;
  isoWeek: number;
  weekday: number;
  memberId: string | null;
  reason: string;
};

export type PlanCapacityOverrideData = {
  id: string;
  memberId: string;
  weekday: number | null;
  isoYear: number | null;
  isoWeek: number | null;
  hours: number;
};

export type PlanPresetData = {
  id: string;
  label: string;
  hours: number;
  sortOrder: number;
};

/** Indica se a pessoa está ausente (folga, férias…) na data AAAA-MM-DD. */
export type IsAbsentFn = (memberId: string, dateKey: string) => boolean;
