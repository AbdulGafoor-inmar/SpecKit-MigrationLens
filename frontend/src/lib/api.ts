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
