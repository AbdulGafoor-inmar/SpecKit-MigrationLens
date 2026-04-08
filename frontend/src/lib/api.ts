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
  AppSettings,
  ADORepository,
  ADOBranch,
  MigrationReport,
  AIAnalysisResponse,
  PullRequestInfo,
  PRReviewResult,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  repoIds?: string[],
  repoBranches?: Record<string, string>,
): Promise<ScanStartResponse> {
  return request<ScanStartResponse>('/scan', {
    method: 'POST',
    body: JSON.stringify({
      organization,
      project,
      repo_ids: repoIds ?? [],
      repo_branches: repoBranches ?? {},
    }),
  });
}

export async function getScanProgress(): Promise<ScanProgress> {
  return request<ScanProgress>('/scan/progress');
}

export async function stopScan(): Promise<{ message: string }> {
  return request<{ message: string }>('/scan/stop', { method: 'POST' });
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

/* ── List repos from ADO (pre-scan) ── */
export async function listRepos(
  organization?: string,
  project?: string,
): Promise<ADORepository[]> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  if (project) params.set('project', project);
  const qs = params.toString();
  return request<ADORepository[]>(`/repos${qs ? `?${qs}` : ''}`);
}

/* ── List branches for a repo ── */
export async function listBranches(
  repoId: string,
  organization?: string,
  project?: string,
): Promise<ADOBranch[]> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  if (project) params.set('project', project);
  const qs = params.toString();
  return request<ADOBranch[]>(`/repos/${repoId}/branches${qs ? `?${qs}` : ''}`);
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

/* ── Settings ── */
export async function getSettings(): Promise<AppSettings> {
  return request<AppSettings>('/settings');
}

/* ── Migration Report ── */
export async function getMigrationReport(
  repoId: string,
  organization?: string,
  project?: string,
): Promise<MigrationReport> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  if (project) params.set('project', project);
  const qs = params.toString();
  return request<MigrationReport>(`/repos/${repoId}/migration-report${qs ? `?${qs}` : ''}`);
}

/* ── AI Analysis ── */
export async function getAIAnalysis(
  repoId: string,
  organization?: string,
): Promise<AIAnalysisResponse> {
  const params = new URLSearchParams();
  if (organization) params.set('organization', organization);
  const qs = params.toString();
  return request<AIAnalysisResponse>(`/repos/${repoId}/ai-analysis${qs ? `?${qs}` : ''}`);
}

export async function getAIHealth(): Promise<{ status: string; model: string; message: string }> {
  return request<{ status: string; model: string; message: string }>('/ai/health');
}

/* ── PR Review ── */
export async function listPullRequests(
  repoId: string,
  status: string = 'all',
): Promise<PullRequestInfo[]> {
  const params = new URLSearchParams({ status });
  return request<PullRequestInfo[]>(`/repos/${repoId}/pull-requests?${params.toString()}`);
}

export async function runPRReview(
  repoId: string,
  prId: number,
): Promise<PRReviewResult> {
  return request<PRReviewResult>(`/repos/${repoId}/pull-requests/${prId}/review`);
}

export async function postPRComment(
  repoId: string,
  prId: number,
  review: PRReviewResult,
): Promise<{ status: string; thread_id: number }> {
  return request<{ status: string; thread_id: number }>(
    `/repos/${repoId}/pull-requests/${prId}/comment`,
    {
      method: 'POST',
      body: JSON.stringify(review),
    },
  );
}

/* ── Auto-Fix ── */
export function getAutoFixStreamUrl(repoId: string): string {
  return `${API_BASE}/autofix/${repoId}`;
}
