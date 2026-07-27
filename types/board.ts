import type {
  BoardListType,
  DemandType,
  PortalStatus,
} from "@prisma/client";

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
  lists: Record<BoardListType, boolean>;
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

export const DEFAULT_BOARD_LISTS: { type: BoardListType; name: string; sortOrder: number }[] = [
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

export const LIST_TYPE_TO_DEMAND_TYPE: Partial<Record<BoardListType, DemandType>> = {
  FEEDS: "FEED",
  STORIES: "STORY",
  FOLLOW_UP: "FOLLOW_UP",
  EXTRA: "EXTRA",
};
