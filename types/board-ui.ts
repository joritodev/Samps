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
  clientName: string;
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
