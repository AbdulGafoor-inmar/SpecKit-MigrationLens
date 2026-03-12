/* ── MigrationLens – shared TypeScript types (mirrors backend schemas) ── */

export type ComplianceStatus = 'pass' | 'fail' | 'na';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ExportFormat = 'json' | 'csv';
export type Complexity = 'simple' | 'moderate' | 'complex';

/* ── API response models ── */

export interface RepositoryInfo {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  last_commit_date: string | null;
  size_kb: number;
}

export interface ComplianceResult {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  status: ComplianceStatus;
  message: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  passed: number;
  total: number;
  results: ComplianceResult[];
}

export interface RepoScanResult {
  repository: RepositoryInfo;
  overall_score: number;
  compliance_status: ComplianceStatus;
  dotnet_version: string | null;
  csharp_version: string | null;
  categories: CategoryScore[];
  scan_timestamp: string;
  complexity: Complexity;
}

export interface DashboardSummary {
  organization: string;
  project: string;
  total_repositories: number;
  scanned_repositories: number;
  average_score: number;
  passing_repositories: number;
  failing_repositories: number;
  repositories: RepoScanResult[];
  scan_timestamp: string;
  category_averages: Record<string, number>;
}

export interface ScanProgress {
  is_scanning: boolean;
  progress: number;
  current_repo: string | null;
  total_repos: number;
  scanned_repos: number;
  message: string;
}

export interface CreateStoryRequest {
  repo_id: string;
  repo_name: string;
  failing_rules: string[];
  overall_score: number;
  organization?: string;
}

export interface CreateStoryResponse {
  work_item_id: number;
  url: string;
  title: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export interface ScanStartResponse {
  message: string;
  status: string;
}

/* ── UI-specific types ── */

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface SeverityConfig {
  color: string;
  bg: string;
  label: string;
}

export const SEVERITY_MAP: Record<Severity, SeverityConfig> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Critical' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'High' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Medium' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Low' },
};

export const STATUS_MAP: Record<ComplianceStatus, { color: string; bg: string; label: string }> = {
  pass: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Pass' },
  fail: { color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Fail' },
  na: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'N/A' },
};

/* ── Wiki types ── */

export interface WikiInfo {
  id: string;
  name: string;
  type: string;
  url: string;
  project_id: string;
  repository_id: string;
}

export interface WikiPage {
  id: number;
  path: string;
  content: string;
  git_item_path: string;
  sub_pages: WikiPage[];
  remote_url: string;
  order: number;
}

export interface WikiPageListResponse {
  wiki_id: string;
  wiki_name: string;
  pages: WikiPage[];
}

/* ── Board / Work Item types ── */

export interface WorkItemInfo {
  id: number;
  title: string;
  state: string;
  work_item_type: string;
  assigned_to: string;
  priority: number;
  tags: string;
  created_date: string;
  changed_date: string;
  url: string;
}

export interface WorkItemQueryResponse {
  count: number;
  work_items: WorkItemInfo[];
}

export interface BoardInfo {
  id: string;
  name: string;
  url: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  item_limit: number;
  state_mappings: Record<string, string>;
}

export interface BoardDetailResponse {
  board_name: string;
  columns: BoardColumn[];
  work_items: WorkItemInfo[];
}

export const COMPLIANCE_CATEGORIES = [
  'SDK & Runtime',
  'Language Features',
  'Project Configuration',
  'NuGet & Dependencies',
  'Code Patterns',
  'DevOps & CI/CD',
  'Performance & AOT',
] as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];
