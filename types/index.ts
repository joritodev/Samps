export * from "./auth";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterParams {
  search?: string;
  clientId?: string;
  status?: string;
  sectorId?: string;
  assigneeId?: string;
  priorityId?: string;
  page?: number;
  pageSize?: number;
}
