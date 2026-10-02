export type BoardDemand = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sector: string | null;
  dueDate: string | null;
  materialUrl: string | null;
  publishedUrl: string | null;
  briefingLockedAt: string | null;
  clientName: string;
  clientId?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  /** Nome de quem está com o cronômetro rodando agora, se houver. */
  producingBy?: string | null;
};

export type BoardColumn = {
  id: string;
  title: string;
  cards: BoardDemand[];
};

export type TaxonomyOption = {
  id: string;
  name: string;
};

/** Setores e prioridades configuráveis, carregados do banco. */
export type BoardTaxonomy = {
  sectors: TaxonomyOption[];
  priorities: TaxonomyOption[];
};
