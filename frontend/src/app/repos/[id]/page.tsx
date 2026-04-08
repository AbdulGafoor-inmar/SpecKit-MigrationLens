'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Clock,
  Bug,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ArrowUpCircle,
  Code2,
  ListChecks,
  Wand2,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlassCard, ScoreRing, StatusBadge, SeverityBadge, ProgressBar } from '@/components/ui';
import { AutoFixModal } from '@/components/autofix/AutoFixModal';
import { useMigrationReport } from '@/hooks/useMigrationReport';
import { useAutoFix } from '@/hooks/useAutoFix';
import { createWorkItem } from '@/lib/api';
import type { CreateStoryRequest, MigrationStep, Severity } from '@/lib/types';
import { useState } from 'react';
import { SEVERITY_MAP } from '@/lib/types';

const categoryColors: Record<string, string> = {
  'SDK & Runtime': 'border-plum-200 bg-plum-50',
  'Language Features': 'border-purple-200 bg-purple-50',
  'Project Configuration': 'border-teal-200 bg-teal-50',
  'NuGet & Dependencies': 'border-amber-200 bg-amber-50',
  'Code Patterns': 'border-emerald-200 bg-emerald-50',
  'DevOps & CI/CD': 'border-sunset-200 bg-sunset-50',
  'AKS & Kubernetes': 'border-violet-200 bg-violet-50',
  'Configuration': 'border-teal-200 bg-teal-50',
  'Logging & Monitoring': 'border-amber-200 bg-amber-50',
  'Performance': 'border-rose-200 bg-rose-50',
  'Performance & AOT': 'border-rose-200 bg-rose-50',
};

const categoryProgressColors: Record<string, string> = {
  'SDK & Runtime': 'bg-plum',
  'Language Features': 'bg-purple-500',
  'Project Configuration': 'bg-teal',
  'NuGet & Dependencies': 'bg-amber-500',
  'Code Patterns': 'bg-emerald-500',
  'DevOps & CI/CD': 'bg-sunset',
  'AKS & Kubernetes': 'bg-violet-500',
  'Configuration': 'bg-teal',
  'Logging & Monitoring': 'bg-amber-500',
  'Performance': 'bg-rose-500',
  'Performance & AOT': 'bg-rose-500',
};

function SeverityIcon({ severity }: { severity: Severity }) {
  const colorMap: Record<Severity, string> = {
    critical: 'text-red-500',
    high: 'text-sunset',
    medium: 'text-amber-500',
    low: 'text-plum',
  };
  return <AlertTriangle className={`h-4 w-4 ${colorMap[severity]}`} />;
}

function MigrationStepCard({
  step,
  isExpanded,
  onToggle,
}: {
  step: MigrationStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isFail = step.status === 'fail';

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isFail
          ? 'border-frost bg-white'
          : 'border-teal-200 bg-teal-50/30'
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors"
      >
        <span className="text-xs font-mono text-frost-dark w-7 shrink-0">
          #{step.step_number}
        </span>
        {isFail ? (
          <AlertTriangle className="h-4 w-4 text-sunset shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-teal shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-plum-dark">{step.rule_name}</span>
            <SeverityBadge severity={step.severity} />
            <span className="text-xs text-frost-dark font-mono">{step.rule_id}</span>
            {step.wiki_source && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-plum-50 text-plum border border-plum-200">
                Wiki: {step.wiki_source}
              </span>
            )}
          </div>
          {step.file_path && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-frost-dark">
              <FileCode className="h-3 w-3" />
              <span className="truncate">{step.file_path}</span>
              {step.line_number && (
                <span className="text-plum">Line {step.line_number}</span>
              )}
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-frost-dark shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-frost-dark shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-frost">
          {/* Description / Verification */}
          {step.description && (
            <div className="mt-3">
              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isFail ? 'text-sunset' : 'text-teal'}`}>
                {isFail ? 'Issue' : 'Verification'}
              </p>
              {isFail ? (
                <p className="text-sm text-plum-dark/80">{step.description}</p>
              ) : (
                <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                  <p className="text-sm text-teal-700">{step.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Current code — red for failures, green for passing (evidence) */}
          {step.current_code && (
            <div>
              <p className="text-xs font-medium text-frost-dark uppercase tracking-wider mb-1">
                {isFail ? 'Current Code' : 'Detected Value'}
              </p>
              <div className={`rounded-lg px-3 py-2 font-mono text-xs overflow-x-auto ${
                isFail
                  ? 'bg-surface-tertiary text-sunset-dark'
                  : 'bg-teal-50 border border-teal-200 text-teal-700'
              }`}>
                <code>{step.current_code}</code>
              </div>
            </div>
          )}

          {/* Suggested fix */}
          {step.suggested_fix && (
            <div>
              <p className="text-xs font-medium text-teal uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Code2 className="h-3 w-3" /> Suggested Fix
              </p>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 font-mono text-xs text-teal-700 overflow-x-auto whitespace-pre-wrap">
                <code>{step.suggested_fix}</code>
              </div>
            </div>
          )}

          {/* Migration guide */}
          {step.migration_guide && (
            <div>
              <p className="text-xs font-medium text-plum uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ListChecks className="h-3 w-3" /> Migration Steps
              </p>
              <div className="bg-plum-50 border border-plum-200 rounded-lg px-3 py-2 text-xs text-plum-dark/80 whitespace-pre-wrap leading-relaxed">
                {step.migration_guide}
              </div>
            </div>
          )}

          {/* Wiki reference */}
          {step.wiki_reference && (
            <div className="flex items-center gap-1.5 text-xs text-plum">
              <BookOpen className="h-3 w-3" />
              <span
                className="hover:underline cursor-pointer"
                dangerouslySetInnerHTML={{ __html: step.wiki_reference }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RepoDetailPage() {
  const params = useParams();
  const repoId = params.id as string;
  const { report, loading, error, refresh } = useMigrationReport(repoId);
  const [workItemUrl, setWorkItemUrl] = useState<string | null>(null);
  const [creatingWI, setCreatingWI] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'fail' | 'pass'>('all');
  const [expandAll, setExpandAll] = useState(false);
  const [autoFixOpen, setAutoFixOpen] = useState(false);

  const autoFix = useAutoFix(repoId);

  const handleStartAutoFix = () => {
    setAutoFixOpen(true);
    const failingRules = (report?.steps ?? [])
      .filter((s) => s.status === 'fail')
      .map((s) => s.rule_id);
    autoFix.startAutoFix({ failing_rules: failingRules });
  };

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedSteps(new Set());
    } else {
      const failingStepNums = (report?.steps ?? [])
        .filter((s) => s.status === 'fail')
        .map((s) => s.step_number);
      setExpandedSteps(new Set(failingStepNums));
    }
    setExpandAll(!expandAll);
  };

  const handleCreateWorkItem = async () => {
    if (!report) return;
    setCreatingWI(true);
    try {
      const failingRules = report.steps
        .filter((s) => s.status === 'fail')
        .map((s) => s.rule_id);

      const payload: CreateStoryRequest = {
        repo_id: report.repository.id,
        repo_name: report.repository.name,
        failing_rules: failingRules,
        overall_score: report.overall_score,
      };

      const result = await createWorkItem(payload);
      setWorkItemUrl(result.url);
    } catch {
      alert('Failed to create work item');
    } finally {
      setCreatingWI(false);
    }
  };

  // Group and filter steps
  const allSteps = report?.steps ?? [];
  const filteredSteps = allSteps.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    return true;
  });

  const categories = [...new Set(allSteps.map((s) => s.category))];

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header />

        <main className="px-6 py-6 space-y-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-frost-dark hover:text-plum-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-plum-100 border-t-plum" />
            </div>
          )}

          {error && (
            <div className="brand-card !p-8 text-center">
              <p className="text-sunset text-sm">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 text-xs text-plum hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {report && (
            <>
              {/* ── Repo Header ── */}
              <div className="flex flex-col lg:flex-row items-start gap-6">
                <GlassCard hover={false} className="flex-1 w-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-plum-dark flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-plum" />
                        {report.repository.name}
                        {report.repository.app_type && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            report.repository.app_type === 'api'
                              ? 'text-plum bg-plum-50'
                              : report.repository.app_type === 'cronjob'
                                ? 'text-amber-600 bg-amber-50'
                                : report.repository.app_type === 'worker'
                                  ? 'text-violet-600 bg-violet-50'
                                  : 'text-frost-dark bg-surface-tertiary'
                          }`}>
                            {report.repository.app_type === 'cronjob' ? 'CronJob'
                              : report.repository.app_type === 'api' ? 'API'
                              : report.repository.app_type === 'worker' ? 'Worker'
                              : 'Library'}
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-frost-dark">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {report.generated_at
                            ? new Date(report.generated_at).toLocaleDateString()
                            : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          {report.dotnet_version_current} → {report.dotnet_version_target}
                        </span>
                        {report.repository.url && (
                          <a
                            href={report.repository.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-plum hover:text-plum-dark"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Open in ADO
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
                    <div>
                      <p className="text-xs text-frost-dark uppercase tracking-wider">Current .NET</p>
                      <p className="text-sm font-semibold text-plum-dark mt-0.5">
                        {report.dotnet_version_current}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-frost-dark uppercase tracking-wider">Target</p>
                      <p className="text-sm font-semibold text-teal mt-0.5">
                        {report.dotnet_version_target} / C# {report.csharp_version_target}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-frost-dark uppercase tracking-wider">Migration Steps</p>
                      <p className="text-sm font-semibold text-sunset mt-0.5">
                        {report.total_steps}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-frost-dark uppercase tracking-wider">Passing</p>
                      <p className="text-sm font-semibold text-teal mt-0.5">
                        {report.passing_rules}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-frost-dark uppercase tracking-wider">Branch</p>
                      <p className="text-sm font-semibold text-plum-dark mt-0.5">
                        {report.repository.default_branch}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Score + Action */}
                <GlassCard hover={false} className="flex flex-col items-center w-full lg:w-56">
                  <ScoreRing score={report.overall_score} size={100} strokeWidth={8} />
                  <div className="mt-4 w-full space-y-2">
                    {workItemUrl ? (
                      <a
                        href={workItemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-teal-50 text-teal border border-teal-200 hover:bg-teal-100 transition-all"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Work Item in ADO
                      </a>
                    ) : (
                      <button
                        onClick={handleCreateWorkItem}
                        disabled={creatingWI || report.total_steps === 0}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-goldenrod-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Bug className="h-4 w-4" />
                        {creatingWI ? 'Creating...' : 'Create Work Item'}
                      </button>
                    )}
                    {/* AI Auto-Fix Button */}
                    <button
                      onClick={handleStartAutoFix}
                      disabled={autoFix.running || report.total_steps === 0}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wand2 className="h-4 w-4" />
                      {autoFix.running ? 'Running...' : 'AI Auto-Fix'}
                    </button>
                  </div>
                </GlassCard>
              </div>

              {/* ── Severity Summary ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Critical', count: report.critical_steps, color: 'text-red-600 bg-red-50 border-red-200' },
                  { label: 'High', count: report.high_steps, color: 'text-sunset bg-sunset-50 border-sunset-200' },
                  { label: 'Medium', count: report.medium_steps, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                  { label: 'Low', count: report.low_steps, color: 'text-plum bg-plum-50 border-plum-200' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-4 py-3 ${item.color}`}
                  >
                    <p className="text-xs uppercase tracking-wider opacity-80">{item.label}</p>
                    <p className="text-2xl font-bold mt-1">{item.count}</p>
                  </div>
                ))}
              </div>

              {/* ── Category Progress ── */}
              {report.categories_summary.length > 0 && (
                <GlassCard hover={false}>
                  <h3 className="text-sm font-semibold text-plum-dark mb-4">Category Compliance</h3>
                  <div className="space-y-3">
                    {report.categories_summary.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-plum-dark/80">{cat.category}</span>
                          <span className="text-xs text-frost-dark">
                            {cat.passed}/{cat.total_rules} passed · {cat.score}%
                          </span>
                        </div>
                        <ProgressBar
                          value={cat.score}
                          color={categoryProgressColors[cat.category] || 'bg-accent-blue'}
                          showPercent={false}
                        />
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}



              {/* ── Wiki Standards ── */}
              {report.wiki_standards.length > 0 && (
                <GlassCard hover={false}>
                  <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-plum" />
                    Wiki Standards — What Needs to Be Done
                    <span className="text-xs text-frost-dark font-normal ml-1">
                      ({report.wiki_standards.length} standards from wiki)
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {report.wiki_standards.map((ws, i) => (
                      <div
                        key={i}
                        className="border border-frost rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <a
                            href={ws.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-plum hover:text-plum-dark font-medium flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {ws.title}
                          </a>
                          <span className="text-[10px] text-frost-dark">{ws.wiki_name}</span>
                        </div>
                        {/* Show actionable items as a checklist */}
                        <div className="text-xs text-plum-dark/80 space-y-1 whitespace-pre-line leading-relaxed">
                          {ws.content_summary.split('\n').map((line, li) => (
                            <div key={li} className={line.startsWith('•') ? 'pl-2 flex items-start gap-1.5' : ''}>
                              {line.startsWith('•') ? (
                                <>
                                  <span className="text-plum mt-0.5 shrink-0">→</span>
                                  <span>{line.slice(2)}</span>
                                </>
                              ) : (
                                <span className="text-frost-dark font-medium uppercase tracking-wider text-[10px]">{line}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {ws.related_rules.map((r) => (
                            <span
                              key={r}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-frost-dark"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* ── Migration Steps ── */}
              <GlassCard hover={false}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-plum-dark flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-plum" />
                    Step-by-Step Migration Guide
                    <span className="text-xs text-frost-dark font-normal ml-1">
                      ({report.total_steps} action{report.total_steps !== 1 ? 's' : ''} required)
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status filter */}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'fail' | 'pass')}
                      className="text-xs bg-surface-secondary border border-frost text-plum-dark rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-plum/30"
                    >
                      <option value="all">All Rules</option>
                      <option value="fail">Failing Only</option>
                      <option value="pass">Passing Only</option>
                    </select>
                    {/* Category filter */}
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-xs bg-surface-secondary border border-frost text-plum-dark rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-plum/30"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {/* Expand/Collapse */}
                    <button
                      onClick={handleExpandAll}
                      className="text-xs text-plum hover:text-plum-dark transition-colors"
                    >
                      {expandAll ? 'Collapse All' : 'Expand All'}
                    </button>
                  </div>
                </div>

                {/* Steps list */}
                <div className="space-y-2">
                  {filteredSteps.length === 0 ? (
                    <p className="text-sm text-frost-dark text-center py-8">
                      No steps match the current filter.
                    </p>
                  ) : (
                    filteredSteps.map((step) => (
                      <MigrationStepCard
                        key={step.step_number}
                        step={step}
                        isExpanded={expandedSteps.has(step.step_number)}
                        onToggle={() => toggleStep(step.step_number)}
                      />
                    ))
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </main>
      </div>

      {/* Auto-Fix Pipeline Modal */}
      <AutoFixModal
        open={autoFixOpen}
        onClose={() => {
          setAutoFixOpen(false);
          autoFix.reset();
        }}
        repoName={report?.repository.name ?? ''}
        failingRulesCount={
          (report?.steps ?? []).filter((s) => s.status === 'fail').length
        }
        steps={autoFix.steps}
        running={autoFix.running}
        done={autoFix.done}
        error={autoFix.error}
        storyUrl={autoFix.storyUrl}
        prUrl={autoFix.prUrl}
        reviewVerdict={autoFix.reviewVerdict}
        reviewScore={autoFix.reviewScore}
        filesChanged={autoFix.filesChanged}
        onCancel={autoFix.cancel}
      />
    </div>
  );
}
