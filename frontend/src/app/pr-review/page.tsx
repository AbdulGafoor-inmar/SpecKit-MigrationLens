'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { listRepos, listPullRequests, runPRReview, postPRComment } from '@/lib/api';
import type {
  ADORepository,
  PullRequestInfo,
  PRReviewResult,
  PRConfidenceBreakdown,
} from '@/lib/types';
import {
  GitPullRequest,
  Loader2,
  AlertCircle,
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  MessageSquarePlus,
  FileCode,
  Bug,
  BookOpen,
  Lightbulb,
  Activity,
  ArrowLeft,
  ExternalLink,
  Filter,
  BarChart3,
  Wrench,
  Code2,
} from 'lucide-react';
import { clsx } from 'clsx';

type Step = 'select-repo' | 'select-pr' | 'review';

export default function PRReviewPage() {
  /* ── State ── */
  const [step, setStep] = useState<Step>('select-repo');

  // Repos
  const [repos, setRepos] = useState<ADORepository[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<ADORepository | null>(null);

  // PRs
  const [prs, setPrs] = useState<PullRequestInfo[]>([]);
  const [prsLoading, setPrsLoading] = useState(false);
  const [prStatusFilter, setPrStatusFilter] = useState<string>('active');
  const [selectedPR, setSelectedPR] = useState<PullRequestInfo | null>(null);

  // Review
  const [review, setReview] = useState<PRReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Comment
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /* ── Load repos on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await listRepos();
        setRepos(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load repos');
      } finally {
        setReposLoading(false);
      }
    })();
  }, []);

  /* ── Helpers ── */
  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()),
  );

  const handleSelectRepo = useCallback(async (repo: ADORepository) => {
    setSelectedRepo(repo);
    setStep('select-pr');
    setPrsLoading(true);
    setError(null);
    try {
      const data = await listPullRequests(repo.id, 'active');
      setPrs(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load PRs');
    } finally {
      setPrsLoading(false);
    }
  }, []);

  const handleStatusFilter = useCallback(async (status: string) => {
    if (!selectedRepo) return;
    setPrStatusFilter(status);
    setPrsLoading(true);
    try {
      const data = await listPullRequests(selectedRepo.id, status);
      setPrs(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load PRs');
    } finally {
      setPrsLoading(false);
    }
  }, [selectedRepo]);

  const handleSelectPR = useCallback(async (pr: PullRequestInfo) => {
    setSelectedPR(pr);
    setStep('review');
    setReviewLoading(true);
    setReviewError(null);
    setReview(null);
    setPosted(false);
    try {
      const result = await runPRReview(pr.repo_id, pr.pr_id);
      setReview(result);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : 'AI review failed');
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const handlePostComment = useCallback(async () => {
    if (!review || !selectedPR || !selectedRepo) return;
    setPosting(true);
    try {
      await postPRComment(selectedRepo.id, selectedPR.pr_id, review);
      setPosted(true);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  }, [review, selectedPR, selectedRepo]);

  const goBack = useCallback(() => {
    if (step === 'review') {
      setStep('select-pr');
      setReview(null);
      setReviewError(null);
      setPosted(false);
    } else if (step === 'select-pr') {
      setStep('select-repo');
      setSelectedRepo(null);
      setPrs([]);
    }
  }, [step]);

  /* ── Verdict helpers ── */
  const verdictConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    APPROVE: { icon: ShieldCheck, color: 'text-teal', bg: 'bg-teal-50', label: 'Approved' },
    NEEDS_CHANGES: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Needs Changes' },
    BLOCK: { icon: ShieldX, color: 'text-sunset', bg: 'bg-sunset-50', label: 'Blocked' },
  };

  const acStatusIcon = (status: string) => {
    if (status === 'implemented') return <CheckCircle2 className="h-4 w-4 text-teal" />;
    if (status === 'missing') return <XCircle className="h-4 w-4 text-sunset" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const severityBadge = (severity: string) => {
    const map: Record<string, string> = {
      critical: 'bg-red-50 text-red-600',
      high: 'bg-sunset-50 text-sunset',
      medium: 'bg-amber-50 text-amber-600',
      low: 'bg-plum-50 text-plum',
    };
    return (
      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', map[severity?.toLowerCase()] || 'bg-surface-tertiary text-frost-dark')}>
        {severity}
      </span>
    );
  };

  /* ── Render ── */
  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="ml-16 flex-1 lg:ml-60">
        <Header title="PR Review" subtitle="AI-powered pull request review against linked stories" />

        <main className="p-6 space-y-6">
          {/* Breadcrumb / Back */}
          {step !== 'select-repo' && (
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-sm text-frost-dark hover:text-plum-dark transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 'select-pr' ? 'Back to repositories' : 'Back to pull requests'}
            </button>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-sunset-200 bg-sunset-50 p-4">
              <AlertCircle className="h-5 w-5 text-sunset shrink-0" />
              <p className="text-sm text-sunset-dark">{error}</p>
            </div>
          )}

          {/* ═══════════ STEP 1: Select Repository ═══════════ */}
          {step === 'select-repo' && (
            <div className="space-y-4">
              <div className="brand-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-plum-dark">Select a Repository</h2>
                  <span className="text-sm text-frost-dark">{filteredRepos.length} repos</span>
                </div>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-frost-dark" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full rounded-xl bg-surface-secondary border border-frost pl-10 pr-4 py-2.5 text-sm text-plum-dark placeholder-frost-dark focus:outline-none focus:ring-2 focus:ring-plum/30"
                  />
                </div>

                {reposLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-plum" />
                    <span className="ml-3 text-sm text-frost-dark">Loading repositories...</span>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className="flex items-center justify-between rounded-xl bg-white border border-frost p-4 text-left hover:bg-surface-secondary hover:border-plum-200 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <GitPullRequest className="h-5 w-5 text-frost-dark shrink-0 group-hover:text-plum transition-colors" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-plum-dark truncate">{repo.name}</p>
                            <p className="text-xs text-frost-dark truncate">{repo.default_branch}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-frost-dark group-hover:text-plum transition-colors shrink-0" />
                      </button>
                    ))}
                    {filteredRepos.length === 0 && (
                      <p className="text-sm text-frost-dark text-center py-8">No repositories found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ STEP 2: Select Pull Request ═══════════ */}
          {step === 'select-pr' && selectedRepo && (
            <div className="space-y-4">
              <div className="brand-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-plum-dark">
                      Pull Requests — {selectedRepo.name}
                    </h2>
                    <p className="text-sm text-frost-dark mt-1">{prs.length} pull requests</p>
                  </div>
                  {/* Status filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-frost-dark" />
                    {['active', 'completed', 'all'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusFilter(s)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                          prStatusFilter === s
                            ? 'bg-plum-50 text-plum'
                            : 'bg-surface-secondary text-frost-dark hover:text-plum-dark hover:bg-surface-tertiary',
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {prsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-plum" />
                    <span className="ml-3 text-sm text-frost-dark">Loading pull requests...</span>
                  </div>
                ) : prs.length === 0 ? (
                  <div className="text-center py-12">
                    <GitPullRequest className="h-10 w-10 text-frost-dark mx-auto mb-3" />
                    <p className="text-sm text-frost-dark">No {prStatusFilter} pull requests found</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {prs.map((pr) => (
                      <button
                        key={pr.pr_id}
                        onClick={() => handleSelectPR(pr)}
                        className="w-full flex items-center justify-between rounded-xl bg-white border border-frost p-4 text-left hover:bg-surface-secondary hover:border-plum-200 transition-all group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              pr.status === 'active' ? 'bg-teal-50 text-teal' :
                              pr.status === 'completed' ? 'bg-plum-50 text-plum' :
                              'bg-surface-tertiary text-frost-dark',
                            )}>
                              {pr.status}
                            </span>
                            <span className="text-xs text-frost-dark">#{pr.pr_id}</span>
                          </div>
                          <p className="text-sm font-medium text-plum-dark truncate">{pr.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-frost-dark">
                            <span>{pr.created_by}</span>
                            <span>{pr.source_branch} → {pr.target_branch}</span>
                            <span>{new Date(pr.creation_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-frost-dark group-hover:text-plum transition-colors shrink-0 ml-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3: AI Review Results ═══════════ */}
          {step === 'review' && selectedPR && (
            <div className="space-y-6">
              {/* PR header */}
              <div className="brand-card rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GitPullRequest className="h-5 w-5 text-plum" />
                      <h2 className="text-lg font-semibold text-plum-dark truncate">{selectedPR.title}</h2>
                      <span className="text-xs text-frost-dark">#{selectedPR.pr_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-frost-dark">
                      <span>{selectedPR.created_by}</span>
                      <span>{selectedPR.source_branch} → {selectedPR.target_branch}</span>
                      <span>{selectedRepo?.name}</span>
                    </div>
                  </div>
                  {selectedPR.url && (
                    <a
                      href={selectedPR.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-plum hover:text-plum-dark transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in ADO
                    </a>
                  )}
                </div>
              </div>

              {/* Loading state */}
              {reviewLoading && (
                <div className="brand-card rounded-2xl p-12 flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-plum mb-4" />
                  <p className="text-sm text-plum-dark font-medium">Running AI Review...</p>
                  <p className="text-xs text-frost-dark mt-1">Analyzing PR diff against linked story and coding standards</p>
                </div>
              )}

              {/* Error state */}
              {reviewError && !reviewLoading && (
                <div className="brand-card rounded-2xl p-6 border border-sunset-200 bg-sunset-50">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-sunset shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-sunset-dark">Review Failed</p>
                      <p className="text-xs text-sunset/80 mt-1">{reviewError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPR(selectedPR)}
                    className="mt-4 btn-ghost text-sm"
                  >
                    Retry Review
                  </button>
                </div>
              )}

              {/* Review results */}
              {review && !reviewLoading && (
                <div className="space-y-6">

                  {/* ── Verdict & Summary ── */}
                  {(() => {
                    const vc = verdictConfig[review.verdict] ?? verdictConfig.NEEDS_CHANGES;
                    const VerdictIcon = vc.icon;
                    return (
                      <div className={clsx('brand-card rounded-2xl p-6 border', vc.color === 'text-teal' ? 'border-teal-200' : vc.color === 'text-sunset' ? 'border-sunset-200' : 'border-amber-200')}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={clsx('p-2.5 rounded-xl', vc.bg)}>
                              <VerdictIcon className={clsx('h-6 w-6', vc.color)} />
                            </div>
                            <div>
                              <h3 className={clsx('text-lg font-bold', vc.color)}>{vc.label}</h3>
                              <p className="text-xs text-frost-dark">
                                Confidence: {review.confidence_score}%
                                {review.confidence_breakdown && review.confidence_breakdown.length > 0 && (
                                  <> · {review.confidence_breakdown.filter(d => d.deductions.length > 0).length} of {review.confidence_breakdown.length} areas have gaps</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!posted ? (
                              <button
                                onClick={handlePostComment}
                                disabled={posting}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-plum-50 text-plum hover:bg-plum-100 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {posting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquarePlus className="h-4 w-4" />
                                )}
                                {posting ? 'Posting...' : 'Post to PR'}
                              </button>
                            ) : (
                              <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 text-teal text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Comment Posted
                              </span>
                            )}
                          </div>
                        </div>
                        {review.summary && (
                          <p className="text-sm text-plum-dark/80 leading-relaxed">{review.summary}</p>
                        )}
                        {review.files_changed.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-frost-dark">
                            <FileCode className="h-3.5 w-3.5" />
                            {review.files_changed.length} files changed
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Confidence Breakdown ── */}
                  {review.confidence_breakdown && review.confidence_breakdown.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-1 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-plum" />
                        Confidence Breakdown
                      </h3>
                      <p className="text-xs text-frost-dark mb-4">
                        Score: {review.confidence_score}/100 — {100 - review.confidence_score} points lost across {review.confidence_breakdown.filter(d => d.deductions.length > 0).length} dimensions
                      </p>
                      <div className="space-y-4">
                        {review.confidence_breakdown.map((dim, i) => {
                          const lost = dim.weight - dim.score;
                          const pct = dim.weight > 0 ? (dim.score / dim.weight) * 100 : 0;
                          const barColor =
                            pct >= 80 ? 'bg-teal' :
                            pct >= 50 ? 'bg-amber-400' :
                            pct >= 20 ? 'bg-orange-400' : 'bg-sunset';
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-plum-dark">{dim.category}</span>
                                <div className="flex items-center gap-2">
                                  <span className={clsx(
                                    'text-sm font-semibold',
                                    pct >= 80 ? 'text-teal' :
                                    pct >= 50 ? 'text-amber-600' :
                                    pct >= 20 ? 'text-orange-500' : 'text-sunset',
                                  )}>
                                    {dim.score}/{dim.weight}
                                  </span>
                                  {lost > 0 && (
                                    <span className="text-xs text-sunset font-medium">-{lost}</span>
                                  )}
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="h-2 w-full rounded-full bg-surface-tertiary overflow-hidden">
                                <div
                                  className={clsx('h-full rounded-full transition-all duration-500', barColor)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {/* Deduction details */}
                              {dim.deductions.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {dim.deductions.map((d, j) => (
                                    <div key={j} className="flex items-start gap-2 text-xs">
                                      <XCircle className="h-3.5 w-3.5 text-sunset shrink-0 mt-0.5" />
                                      <span className="text-frost-dark">{d}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {dim.deductions.length === 0 && (
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-teal">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Full marks — no issues found
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Linked Work Items ── */}
                  {review.linked_work_items.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-plum" />
                        Linked Work Items
                      </h3>
                      <div className="space-y-3">
                        {review.linked_work_items.map((wi) => (
                          <div key={wi.id} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-plum-50 text-plum">
                                  {wi.work_item_type}
                                </span>
                                <span className="text-xs text-frost-dark">#{wi.id}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-surface-tertiary text-frost-dark">{wi.state}</span>
                              </div>
                              {wi.url && (
                                <a
                                  href={wi.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-plum hover:text-plum-dark transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Open in ADO
                                </a>
                              )}
                            </div>
                            <p className="text-sm font-medium text-plum-dark">{wi.title}</p>
                            {wi.description && (
                              <p className="text-xs text-frost-dark mt-1 line-clamp-2">{wi.description}</p>
                            )}
                            {wi.acceptance_criteria && (
                              <details className="mt-2">
                                <summary className="text-xs text-plum cursor-pointer hover:text-plum-dark">
                                  Acceptance Criteria
                                </summary>
                                <p className="text-xs text-frost-dark mt-1 whitespace-pre-line">{wi.acceptance_criteria}</p>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Story Match ── */}
                  <div className="brand-card rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-plum" />
                      Story Alignment
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      {review.story_match === 'fully_matches' && <CheckCircle2 className="h-5 w-5 text-teal" />}
                      {review.story_match === 'partially_matches' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                      {review.story_match === 'does_not_match' && <XCircle className="h-5 w-5 text-sunset" />}
                      <span className={clsx(
                        'text-sm font-medium',
                        review.story_match === 'fully_matches' ? 'text-teal' :
                        review.story_match === 'partially_matches' ? 'text-amber-600' : 'text-sunset',
                      )}>
                        {review.story_match.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    {review.story_match_details && (
                      <p className="text-sm text-frost-dark">{review.story_match_details}</p>
                    )}
                  </div>

                  {/* ── Acceptance Criteria ── */}
                  {review.acceptance_criteria.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-plum" />
                        Acceptance Criteria ({review.acceptance_criteria.filter(a => a.status === 'implemented').length}/{review.acceptance_criteria.length} implemented)
                      </h3>
                      <div className="space-y-2">
                        {review.acceptance_criteria.map((ac, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-white border border-frost p-3">
                            {acStatusIcon(ac.status)}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-plum-dark">{ac.criterion}</p>
                              {ac.details && <p className="text-xs text-frost-dark mt-1">{ac.details}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Code Quality Issues ── */}
                  {review.code_quality_issues.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <Bug className="h-4 w-4 text-sunset" />
                        Code Quality Issues ({review.code_quality_issues.length})
                      </h3>
                      <div className="space-y-3">
                        {review.code_quality_issues.map((issue, i) => (
                          <div key={i} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-center gap-2 mb-1">
                              {severityBadge(issue.severity)}
                              <p className="text-sm font-medium text-plum-dark">{issue.issue}</p>
                            </div>
                            {(issue.file || issue.method) && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <Code2 className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                                <span className="text-xs font-mono text-plum-dark/70">
                                  {issue.file}{issue.line ? `:${issue.line}` : ''}
                                  {issue.method ? ` → ${issue.method}` : ''}
                                </span>
                              </div>
                            )}
                            {issue.details && <p className="text-xs text-frost-dark mt-1.5">{issue.details}</p>}
                            {issue.suggested_fix && (
                              <div className="mt-2 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                  <Wrench className="h-3.5 w-3.5 text-teal" />
                                  <span className="text-xs font-semibold text-teal">Suggested Fix</span>
                                </div>
                                <pre className="p-3 overflow-x-auto"><code className="text-xs text-[#e6edf3] font-mono leading-relaxed">{issue.suggested_fix}</code></pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Business Logic Issues ── */}
                  {review.business_logic_issues.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Business Logic Issues ({review.business_logic_issues.length})
                      </h3>
                      <div className="space-y-3">
                        {review.business_logic_issues.map((issue, i) => (
                          <div key={i} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-center gap-2 mb-1">
                              {severityBadge(issue.severity)}
                              <p className="text-sm font-medium text-plum-dark">{issue.issue}</p>
                            </div>
                            {(issue.file || issue.method) && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <Code2 className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                                <span className="text-xs font-mono text-plum-dark/70">
                                  {issue.file}{issue.line ? `:${issue.line}` : ''}
                                  {issue.method ? ` → ${issue.method}` : ''}
                                </span>
                              </div>
                            )}
                            {issue.details && <p className="text-xs text-frost-dark mt-1.5">{issue.details}</p>}
                            {issue.suggested_fix && (
                              <div className="mt-2 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                  <Wrench className="h-3.5 w-3.5 text-teal" />
                                  <span className="text-xs font-semibold text-teal">Suggested Fix</span>
                                </div>
                                <pre className="p-3 overflow-x-auto"><code className="text-xs text-[#e6edf3] font-mono leading-relaxed">{issue.suggested_fix}</code></pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Implementation Issues ── */}
                  {review.standards_violations.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-plum" />
                        Implementation Issues ({review.standards_violations.length})
                      </h3>
                      <div className="space-y-3">
                        {review.standards_violations.map((v, i) => (
                          <div key={i} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-center gap-2 mb-1">
                              {severityBadge(v.severity)}
                              <p className="text-sm font-medium text-plum-dark">{v.violation}</p>
                            </div>
                            <p className="text-xs text-frost-dark mt-1">Story requirement: {v.standard}</p>
                            {(v.file || v.method) && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <Code2 className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                                <span className="text-xs font-mono text-plum-dark/70">
                                  {v.file}{v.line ? `:${v.line}` : ''}
                                  {v.method ? ` → ${v.method}` : ''}
                                </span>
                              </div>
                            )}
                            {v.details && <p className="text-xs text-frost-dark mt-1.5">{v.details}</p>}
                            {v.suggested_fix && (
                              <div className="mt-2 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                  <Wrench className="h-3.5 w-3.5 text-teal" />
                                  <span className="text-xs font-semibold text-teal">Suggested Fix</span>
                                </div>
                                <pre className="p-3 overflow-x-auto"><code className="text-xs text-[#e6edf3] font-mono leading-relaxed">{v.suggested_fix}</code></pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Risks ── */}
                  {review.risks.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-sunset" />
                        Risks ({review.risks.length})
                      </h3>
                      <div className="space-y-3">
                        {review.risks.map((risk, i) => (
                          <div key={i} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-center gap-2 mb-1">
                              {severityBadge(risk.severity)}
                              <span className="px-2 py-0.5 rounded-full text-xs bg-surface-tertiary text-frost-dark">{risk.type}</span>
                              <p className="text-sm font-medium text-plum-dark">{risk.risk}</p>
                            </div>
                            {(risk.file || risk.method) && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <Code2 className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                                <span className="text-xs font-mono text-plum-dark/70">
                                  {risk.file}{risk.line ? `:${risk.line}` : ''}
                                  {risk.method ? ` → ${risk.method}` : ''}
                                </span>
                              </div>
                            )}
                            {risk.details && <p className="text-xs text-frost-dark mt-1.5">{risk.details}</p>}
                            {risk.suggested_fix && (
                              <div className="mt-2 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                  <Wrench className="h-3.5 w-3.5 text-amber-400" />
                                  <span className="text-xs font-semibold text-amber-400">Mitigation</span>
                                </div>
                                <pre className="p-3 overflow-x-auto"><code className="text-xs text-[#e6edf3] font-mono leading-relaxed">{risk.suggested_fix}</code></pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Completeness ── */}
                  <div className="brand-card rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-plum" />
                      Completeness Check
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Tests', value: review.completeness.has_tests },
                        { label: 'Documentation', value: review.completeness.has_docs },
                        { label: 'Config Changes', value: review.completeness.has_config_changes },
                        { label: 'Migrations', value: review.completeness.has_migrations },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 rounded-xl bg-white border border-frost p-3">
                          {item.value ? (
                            <CheckCircle2 className="h-4 w-4 text-teal" />
                          ) : (
                            <XCircle className="h-4 w-4 text-frost-dark" />
                          )}
                          <span className="text-sm text-plum-dark/80">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {review.completeness.notes && (
                      <p className="text-xs text-frost-dark mt-3">{review.completeness.notes}</p>
                    )}
                  </div>

                  {/* ── Suggestions ── */}
                  {review.suggestions.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-goldenrod" />
                        Suggestions ({review.suggestions.length})
                      </h3>
                      <div className="space-y-3">
                        {review.suggestions.map((s, i) => (
                          <div key={i} className="rounded-xl bg-white border border-frost p-4">
                            <div className="flex items-start gap-3">
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium shrink-0 mt-0.5',
                                s.priority === 'high' ? 'bg-sunset-50 text-sunset' :
                                s.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                'bg-plum-50 text-plum',
                              )}>
                                {s.priority}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-plum-dark">{s.suggestion}</p>
                                {s.category && <p className="text-xs text-frost-dark mt-1">{s.category}</p>}
                                {(s.file || s.method) && (
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Code2 className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                                    <span className="text-xs font-mono text-plum-dark/70">
                                      {s.file}{s.line ? `:${s.line}` : ''}
                                      {s.method ? ` → ${s.method}` : ''}
                                    </span>
                                  </div>
                                )}
                                {s.code_suggestion && (
                                  <div className="mt-2 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                      <Lightbulb className="h-3.5 w-3.5 text-[#e3b341]" />
                                      <span className="text-xs font-semibold text-[#e3b341]">Suggested Code</span>
                                    </div>
                                    <pre className="p-3 overflow-x-auto"><code className="text-xs text-[#e6edf3] font-mono leading-relaxed">{s.code_suggestion}</code></pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Files Changed ── */}
                  {review.files_changed.length > 0 && (
                    <div className="brand-card rounded-2xl p-6">
                      <h3 className="text-sm font-semibold text-plum-dark mb-3 flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-frost-dark" />
                        Files Changed ({review.files_changed.length})
                      </h3>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {review.files_changed.map((f, i) => (
                          <p key={i} className="text-xs text-frost-dark font-mono py-1 px-2 rounded bg-surface-secondary">{f}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
