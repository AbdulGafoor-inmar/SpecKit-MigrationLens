/* ── MigrationLens – shared TypeScript types (mirrors backend schemas) ── */

export type ComplianceStatus = 'pass' | 'fail' | 'na';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ExportFormat = 'json' | 'csv';
export type Complexity = 'simple' | 'moderate' | 'complex';

/* ── API response models ── */

export type AppType = 'api' | 'cronjob' | 'worker' | 'library';

export interface RepositoryInfo {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  last_commit_date: string | null;
  size_kb: number;
  app_type: AppType;
}

export interface ComplianceResult {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  status: ComplianceStatus;
  details: string;
  file_path: string | null;
  line_number: number | null;
  current_code: string;
  suggested_fix: string;
  migration_guide: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  passed: number;
  failed: number;
  not_applicable: number;
  total_rules: number;
}

export interface RepoScanResult {
  repository: RepositoryInfo;
  overall_score: number;
  compliance_status: ComplianceStatus;
  dotnet_version: string | null;
  csharp_version: string | null;
  categories: CategoryScore[];
  compliance_results: ComplianceResult[];
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

/* ── ADO Repository (lightweight, pre-scan) ── */

export interface ADORepository {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  project: string;
  dotnet_version: string;
  last_commit_date: string;
}

/* ── Branch ── */

export interface ADOBranch {
  name: string;
  objectId: string;
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
  'AKS & Kubernetes',
  'Performance & AOT',
] as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number];

/* ── Settings types ── */

export interface AppSettings {
  ado_organization: string;
  ado_project: string;
  ado_base_url: string;
  backend_url: string;
  cors_origins: string;
  cache_dir: string;
  cache_ttl: number;
  has_pat: boolean;
}

/* ── Migration Report types ── */

export interface MigrationStep {
  step_number: number;
  rule_id: string;
  rule_name: string;
  category: string;
  severity: Severity;
  status: ComplianceStatus;
  file_path: string;
  line_number: number | null;
  current_code: string;
  suggested_fix: string;
  description: string;
  migration_guide: string;
  wiki_reference: string;
  wiki_source: string;
}

export interface WikiStandard {
  title: string;
  source_page: string;
  wiki_name: string;
  content_summary: string;
  related_rules: string[];
  url: string;
}

export interface MigrationReport {
  repository: RepositoryInfo;
  steps: MigrationStep[];
  total_steps: number;
  critical_steps: number;
  high_steps: number;
  medium_steps: number;
  low_steps: number;
  passing_rules: number;
  failing_rules: number;
  overall_score: number;
  dotnet_version_current: string;
  dotnet_version_target: string;
  csharp_version_target: string;
  wiki_standards: WikiStandard[];
  categories_summary: CategoryScore[];
  generated_at: string;
}

/* ── AI Analysis types ── */

export interface AIInsight {
  title: string;
  description: string;
  severity: string;
  category: string;
}

export interface AIRecommendation {
  priority: number;
  action: string;
  effort: string;
  impact: string;
}

export interface AICodeAnalysis {
  summary: string;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
}

export interface AIRiskFactor {
  factor: string;
  impact: string;
  description: string;
}

export interface AIRiskAssessment {
  risk_level: string;
  risk_score: number;
  effort_estimate_days: number;
  risk_factors: AIRiskFactor[];
  mitigation_suggestions: string[];
  confidence: number;
}

export interface AIMigrationTask {
  task: string;
  effort_hours: number;
  rule_ids: string[];
}

export interface AIMigrationPhase {
  name: string;
  description: string;
  order: number;
  tasks: AIMigrationTask[];
  estimated_hours: number;
}

export interface AIPRSuggestion {
  title: string;
  description: string;
  files_to_change: string[];
  phase: number;
}

export interface AIBreakingChange {
  description: string;
  mitigation: string;
}

export interface AIMigrationPlan {
  phases: AIMigrationPhase[];
  estimated_total_hours: number;
  pr_suggestions: AIPRSuggestion[];
  breaking_changes: AIBreakingChange[];
}

export interface AIAnalysisResponse {
  code_analysis: AICodeAnalysis;
  risk_assessment: AIRiskAssessment;
  migration_plan: AIMigrationPlan;
  ai_available: boolean;
  generated_at: string;
}

/* ── PR Review types ── */

export interface PullRequestInfo {
  pr_id: number;
  title: string;
  description: string;
  status: string;
  source_branch: string;
  target_branch: string;
  created_by: string;
  creation_date: string;
  url: string;
  repo_id: string;
  repo_name: string;
}

export interface PRLinkedWorkItem {
  id: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  work_item_type: string;
  state: string;
  url: string;
}

export interface PRAcceptanceCriterionResult {
  criterion: string;
  status: string;
  details: string;
}

export interface PRCodeQualityIssue {
  issue: string;
  severity: string;
  file: string;
  line: number | null;
  method: string;
  details: string;
  suggested_fix: string;
}

export interface PRBusinessLogicIssue {
  issue: string;
  severity: string;
  file: string;
  line: number | null;
  method: string;
  details: string;
  suggested_fix: string;
}

export interface PRStandardsViolation {
  violation: string;
  standard: string;
  severity: string;
  file: string;
  line: number | null;
  method: string;
  details: string;
  suggested_fix: string;
}

export interface PRRisk {
  risk: string;
  type: string;
  severity: string;
  file: string;
  line: number | null;
  method: string;
  details: string;
  suggested_fix: string;
}

export interface PRCompleteness {
  has_tests: boolean;
  has_docs: boolean;
  has_config_changes: boolean;
  has_migrations: boolean;
  notes: string;
}

export interface PRSuggestion {
  suggestion: string;
  priority: string;
  category: string;
  file: string;
  line: number | null;
  method: string;
  code_suggestion: string;
}

export interface PRConfidenceBreakdown {
  category: string;
  weight: number;
  score: number;
  deductions: string[];
}

export interface PRReviewResult {
  pr: PullRequestInfo;
  linked_work_items: PRLinkedWorkItem[];
  story_match: string;
  story_match_details: string;
  acceptance_criteria: PRAcceptanceCriterionResult[];
  business_logic_issues: PRBusinessLogicIssue[];
  code_quality_issues: PRCodeQualityIssue[];
  standards_violations: PRStandardsViolation[];
  risks: PRRisk[];
  completeness: PRCompleteness;
  suggestions: PRSuggestion[];
  verdict: string;
  confidence_score: number;
  confidence_breakdown: PRConfidenceBreakdown[];
  summary: string;
  files_changed: string[];
  generated_at: string;
}

/* ── Auto-Fix Pipeline ── */

export type AutoFixStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AutoFixStep {
  step: number;
  name: string;
  status: AutoFixStepStatus;
  details: string;
  url: string;
  data: Record<string, unknown>;
}

export interface AutoFixRequest {
  failing_rules?: string[];
  organization?: string;
  project?: string;
}

export interface AutoFixResult {
  repo_id: string;
  repo_name: string;
  story_id: number;
  story_url: string;
  branch_name: string;
  pr_id: number;
  pr_url: string;
  files_changed: string[];
  review_verdict: string;
  review_score: number;
  steps: AutoFixStep[];
  status: string;
  error: string;
  started_at: string;
  completed_at: string;
}
