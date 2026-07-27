export const SEARCH_TYPES = [
  "clientes",
  "demandas",
  "projetos",
  "captacoes",
  "usuarios",
  "arquivos",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABEL: Record<SearchType, string> = {
  clientes: "Clientes",
  demandas: "Demandas",
  projetos: "Projetos",
  captacoes: "Captações",
  usuarios: "Usuários",
  arquivos: "Arquivos",
};

export interface SearchHit {
  id: string;
  type: SearchType;
  title: string;
  subtitle: string | null;
  href: string;
}

export function isSearchType(value: string): value is SearchType {
  return (SEARCH_TYPES as readonly string[]).includes(value);
}
