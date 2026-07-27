export type ClientTeamMember = {
  id: string;
  name: string;
  role: string;
};

export type ClientListItem = {
  id: string;
  name: string;
  logo: string | null;
  active: boolean;
  openDemands: number;
  team: ClientTeamMember[];
};

export type ClientDetail = {
  id: string;
  name: string;
  logo: string | null;
  active: boolean;
  contractScope: string | null;
  createdAt: string;
  openDemands: number;
  totalDemands: number;
  publishedDemands: number;
  team: ClientTeamMember[];
  demands: {
    id: string;
    title: string;
    status: string;
    sector: string | null;
    priority: string;
    deadline: string | null;
  }[];
};
