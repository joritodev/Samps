export type ClientTeamMember = {
  id: string;
  name: string;
  role: string;
};

export type ClientListItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  active: boolean;
  openDemands: number;
  hasBoard: boolean;
  team: ClientTeamMember[];
};

export type ClientContractService = {
  id: string;
  name: string;
  quantity: number | null;
  periodicity: string;
  contentTypeId: string | null;
};

export type ClientDetail = {
  id: string;
  name: string;
  logoUrl: string | null;
  active: boolean;
  segment: string | null;
  planName: string | null;
  birthDate: string | null;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  contractDocUrl: string | null;
  studyDocUrl: string | null;
  contractServices: ClientContractService[];
  createdAt: string;
  openDemands: number;
  totalDemands: number;
  publishedDemands: number;
  hasBoard: boolean;
  team: ClientTeamMember[];
  demands: {
    id: string;
    title: string;
    status: string;
    sector: string | null;
    priority: string;
    dueDate: string | null;
  }[];
};
