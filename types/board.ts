import type {
  BoardListType,
  ClientStatus,
  DemandType,
  PortalStatus,
} from "@prisma/client";

/** Tipos de coluna do wizard / catálogo — CUSTOM é só para colunas livres. */
export type CatalogBoardListType = Exclude<BoardListType, "CUSTOM">;

/** Denormaliza coluna do card no quadro do cliente.
 * CUSTOM usa id estável; tipos de catálogo mantêm o slug legado (feeds, stories…).
 * Não usar para etapas de setor (production/review) — isso vive em outro fluxo.
 */
export function boardColumnForList(list: {
  id: string;
  type: string;
}): string {
  if (list.type === "CUSTOM") return `list:${list.id}`;
  return list.type.toLowerCase();
}

export function normalizeBoardListName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidBoardListName(value: string): boolean {
  const name = normalizeBoardListName(value);
  return name.length >= 1 && name.length <= 60;
}

export interface ContractServiceInput {
  name: string;
  quantity: number;
  demandType: DemandType;
  contentTypeSlug?: string;
}

export interface BoardWizardInput {
  clientId?: string;
  client: {
    name: string;
    legalName?: string;
    tradeName?: string;
    segment?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
    brandColor?: string;
    startedAt?: Date;
    internalNotes?: string;
    status?: ClientStatus;
  };
  team: {
    socialMediaId: string;
    secondarySocialMediaId?: string;
    primaryResponsibleId: string;
    accountLeaderId?: string;
    designSectorId?: string;
    videoSectorId?: string;
  };
  contract: {
    planName: string;
    startDate: Date;
    endDate?: Date;
    renewalDay?: number;
    competenceMonth: number;
    competenceYear: number;
    notes?: string;
    services: ContractServiceInput[];
  };
  lists: Record<CatalogBoardListType, boolean>;
  portal: {
    displayName: string;
    logoUrl?: string;
    primaryColor?: string;
    agencyContactName?: string;
    agencyContactUserId?: string;
    calendarEnabled: boolean;
    completedVisible: boolean;
    upcomingVisible: boolean;
    status: PortalStatus;
  };
  createdById: string;
}

export const DEFAULT_BOARD_LISTS: {
  type: CatalogBoardListType;
  name: string;
  sortOrder: number;
}[] = [
  { type: "FEEDS", name: "Feeds obrigatórios", sortOrder: 1 },
  { type: "STORIES", name: "Stories obrigatórios", sortOrder: 2 },
  { type: "FOLLOW_UP", name: "Demandas e acompanhamentos", sortOrder: 3 },
  { type: "EXTRA", name: "Demandas extras", sortOrder: 4 },
  { type: "SHOOTS", name: "Captações", sortOrder: 5 },
  { type: "PROJECTS", name: "Projetos", sortOrder: 6 },
  { type: "USEFUL_LINKS", name: "Links úteis", sortOrder: 7 },
];

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  FEED: "Estático",
  STORY: "Stories",
  REEL: "Reel",
  VIDEO: "Vídeo",
  DESIGN: "Design",
};

export const LIST_TYPE_TO_DEMAND_TYPE: Partial<
  Record<CatalogBoardListType, DemandType>
> = {
  FEEDS: "FEED",
  STORIES: "STORY",
  FOLLOW_UP: "FOLLOW_UP",
  EXTRA: "EXTRA",
};
