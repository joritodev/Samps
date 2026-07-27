/** Tipos seguros do Portal do Cliente — sem dados internos da operação. */

export type ClientPortalStatus =
  | "IN_PRODUCTION"
  | "AWAITING_APPROVAL"
  | "PUBLISHED";

export type ClientPortalMaterial = {
  id: string;
  title: string;
  format: string;
  /** Data prevista de publicação (nunca "prazo interno"). */
  scheduledDate: string;
  status: ClientPortalStatus;
  materialUrl: string | null;
};

export type ClientPortalStats = {
  planned: number;
  inProduction: number;
  published: number;
};

export type ClientPortalOverview = {
  clientId: string;
  clientName: string;
  competenceLabel: string;
  stats: ClientPortalStats;
  materials: ClientPortalMaterial[];
};
