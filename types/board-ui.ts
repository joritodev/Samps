export type BoardDemand = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sector: string | null;
  deadline: string | null;
  materialUrl: string | null;
  publishedUrl: string | null;
  clientName: string;
};

export type BoardColumn = {
  id: string;
  title: string;
  cards: BoardDemand[];
};
