/* ── MigrationLens – API client (fetch wrapper) ── */

import type {
  DashboardSummary,
  ScanProgress,
  ScanStartResponse,
  RepoScanResult,
  CreateStoryRequest,
  CreateStoryResponse,
  HealthResponse,
  ExportFormat,
  WikiInfo,
  WikiPage,
  WikiPageListResponse,
  BoardInfo,
  BoardDetailResponse,
  WorkItemQueryResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<T>;
}

/* ── Health ── */
export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

/* ── Dashboard ── */
export async function getDashboard(
  organization?: string,
  project?: string,
): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  if (project) params.set('project', project);
  const qs = params.toString();
  return request<DashboardSummary>(`/dashboard${qs ? `?${qs}` : ''}`);
}

/* ── Scan ── */
export async function startScan(
  organization?: string,
  project?: string,
): Promise<ScanStartResponse> {
  return request<ScanStartResponse>('/scan', {
    method: 'POST',
    body: JSON.stringify({ organization, project }),
  });
}

export async function getScanProgress(): Promise<ScanProgress> {
  return request<ScanProgress>('/scan/progress');
}

/* ── Repository detail ── */
export async function getRepoDetail(
  repoId: string,
  organization?: string,
): Promise<RepoScanResult> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  const qs = params.toString();
  return request<RepoScanResult>(`/repos/${repoId}${qs ? `?${qs}` : ''}`);
}

/* ── Work items ── */
export async function createWorkItem(
  payload: CreateStoryRequest,
): Promise<CreateStoryResponse> {
  return request<CreateStoryResponse>('/workitems', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* ── Export ── */
export function getExportUrl(
  format: ExportFormat = 'json',
  organization?: string,
): string {
  const params = new URLSearchParams({ format });
  if (organization) params.set('organization', organization);
  return `${API_BASE}/export?${params.toString()}`;
}

export { ApiError };

/* ── Wiki ── */
export async function listWikis(project?: string): Promise<WikiInfo[]> {
  const params = new URLSearchParams();
  if (project) params.set('project', project);
  const qs = params.toString();
  return request<WikiInfo[]>(`/wiki${qs ? `?${qs}` : ''}`);
}

export async function getWikiPage(
  wikiId: string,
  path: string = '/',
  project?: string,
): Promise<WikiPage> {
  const params = new URLSearchParams({ path });
  if (project) params.set('project', project);
  return request<WikiPage>(`/wiki/${wikiId}/page?${params.toString()}`);
}

export async function listWikiPages(
  wikiId: string,
  path: string = '/',
  project?: string,
): Promise<WikiPageListResponse> {
  const params = new URLSearchParams({ path });
  if (project) params.set('project', project);
  return request<WikiPageListResponse>(`/wiki/${wikiId}/pages?${params.toString()}`);
}

/* ── Boards ── */
export async function listBoards(project?: string, team?: string): Promise<BoardInfo[]> {
  const params = new URLSearchParams();
  if (project) params.set('project', project);
  if (team) params.set('team', team);
  const qs = params.toString();
  return request<BoardInfo[]>(`/boards${qs ? `?${qs}` : ''}`);
}

export async function getBoardDetail(
  boardName: string,
  project?: string,
  team?: string,
): Promise<BoardDetailResponse> {
  const params = new URLSearchParams();
  if (project) params.set('project', project);
  if (team) params.set('team', team);
  const qs = params.toString();
  return request<BoardDetailResponse>(`/boards/${boardName}${qs ? `?${qs}` : ''}`);
}

export async function listWorkItems(
  project?: string,
  workItemType: string = 'User Story',
  state?: string,
  tags?: string,
  top: number = 200,
): Promise<WorkItemQueryResponse> {
  const params = new URLSearchParams({ work_item_type: workItemType, top: String(top) });
  if (project) params.set('project', project);
  if (state) params.set('state', state);
  if (tags) params.set('tags', tags);
  return request<WorkItemQueryResponse>(`/boards/workitems/list?${params.toString()}`);
}
