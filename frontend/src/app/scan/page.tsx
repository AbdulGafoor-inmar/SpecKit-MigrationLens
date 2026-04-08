'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { startScan, getScanProgress, stopScan, listRepos, listBranches } from '@/lib/api';
import type { ScanProgress, ADORepository, ADOBranch } from '@/lib/types';
import {
  ScanLine,
  Loader2,
  AlertCircle,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GitBranch,
  BarChart3,
  StopCircle,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function ScanPage() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Repo & branch selection state ── */
  const [repos, setRepos] = useState<ADORepository[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [repoBranches, setRepoBranches] = useState<Record<string, ADOBranch[]>>({});
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({});
  const [branchLoading, setBranchLoading] = useState<Record<string, boolean>>({});
  const [showRepoSelector, setShowRepoSelector] = useState(true);
  const [repoSearch, setRepoSearch] = useState('');

  /* ── Fetch repos on mount ── */
  useEffect(() => {
    listRepos()
      .then((r) => {
        setRepos(r);
        setReposLoading(false);
      })
      .catch(() => setReposLoading(false));
  }, []);

  /* ── Fetch branches for a repo (on-demand) ── */
  const fetchBranchesFor = useCallback((repoId: string) => {
    if (repoBranches[repoId] || branchLoading[repoId]) return;
    setBranchLoading((bl) => ({ ...bl, [repoId]: true }));
    listBranches(repoId)
      .then((branches) => {
        setRepoBranches((rb) => ({ ...rb, [repoId]: branches }));
        setBranchLoading((bl) => ({ ...bl, [repoId]: false }));
      })
      .catch(() => {
        setBranchLoading((bl) => ({ ...bl, [repoId]: false }));
      });
  }, [repoBranches, branchLoading]);

  /* ── Toggle repo selection ── */
  const toggleRepo = useCallback((repoId: string, defaultBranch: string) => {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
        setSelectedBranches((sb) => ({ ...sb, [repoId]: sb[repoId] || defaultBranch }));
      }
      return next;
    });
  }, []);

  /* ── Select all / none ── */
  const selectAll = useCallback(() => {
    const filtered = repos.filter((r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()),
    );
    const allIds = new Set(filtered.map((r) => r.id));
    setSelectedRepos(allIds);
    const defaults: Record<string, string> = {};
    filtered.forEach((r) => {
      defaults[r.id] = selectedBranches[r.id] || r.default_branch;
    });
    setSelectedBranches((sb) => ({ ...sb, ...defaults }));
  }, [repos, repoSearch, selectedBranches]);

  const selectNone = useCallback(() => {
    setSelectedRepos(new Set());
  }, []);

  /* ── Poll scan progress ── */
  const fetchProgress = useCallback(async () => {
    try {
      const p = await getScanProgress();
      setProgress(p);
      return p;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch progress';
      setError(msg);
      return null;
    }
  }, []);

  /* Start polling on mount */
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  /* Auto-poll when scanning is active */
  useEffect(() => {
    if (progress?.is_scanning) {
      pollingRef.current = setInterval(fetchProgress, 2000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [progress?.is_scanning, fetchProgress]);

  /* ── Trigger new scan ── */
  const handleStartScan = async () => {
    setStarting(true);
    setError(null);
    try {
      const repoIds = selectedRepos.size > 0 ? Array.from(selectedRepos) : undefined;
      // Build branch mapping only for repos with non-default branches
      const branchMap: Record<string, string> = {};
      if (repoIds) {
        for (const id of repoIds) {
          if (selectedBranches[id]) {
            branchMap[id] = selectedBranches[id];
          }
        }
      }
      await startScan(
        undefined,
        undefined,
        repoIds,
        Object.keys(branchMap).length > 0 ? branchMap : undefined,
      );
      // Begin polling
      setTimeout(fetchProgress, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start scan';
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const isScanning = progress?.is_scanning ?? false;
  const pct = progress?.progress ?? 0;

  /* ── Stop scan ── */
  const handleStopScan = async () => {
    setError(null);
    try {
      await stopScan();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to stop scan';
      setError(msg);
    }
  };

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={fetchProgress} />

        <main className="px-6 py-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-plum-50">
                <ScanLine className="h-5 w-5 text-plum" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-plum-dark">
                  Repository Scan
                </h2>
                <p className="text-sm text-frost-dark">
                  Scan Azure DevOps repositories for .NET 10 / C# 14 compliance
                </p>
              </div>
            </div>

            {/* Start/Stop buttons */}
            <div className="flex items-center gap-2">
              {isScanning && (
                <button
                  onClick={handleStopScan}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-sunset-50 text-sunset border border-sunset-200 hover:bg-sunset-100 transition-all"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop Scan
                </button>
              )}
              <button
                onClick={handleStartScan}
                disabled={isScanning || starting}
                className={clsx(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
                  isScanning || starting
                    ? 'bg-surface-tertiary text-frost-dark cursor-not-allowed'
                    : 'btn-primary',
                )}
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isScanning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {starting
                  ? 'Starting...'
                  : isScanning
                    ? 'Scanning...'
                    : 'Start Scan'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="brand-card p-4 flex items-center gap-3 text-sunset">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Repository & Branch Selector */}
          <div className="brand-card overflow-hidden">
            <button
              onClick={() => setShowRepoSelector(!showRepoSelector)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-plum" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-plum-dark">
                    Select Repositories
                    {!reposLoading && (
                      <span className="ml-2 text-xs font-normal text-frost-dark">
                        {repos.length} found
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-frost-dark">
                    {selectedRepos.size === 0
                      ? 'All repositories (default branches)'
                      : `${selectedRepos.size} repo${selectedRepos.size !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
              </div>
              {showRepoSelector ? (
                <ChevronUp className="h-4 w-4 text-frost-dark" />
              ) : (
                <ChevronDown className="h-4 w-4 text-frost-dark" />
              )}
            </button>

            {showRepoSelector && (
              <div className="border-t border-frost">
                {/* Search + Select All/None */}
                <div className="flex items-center gap-3 px-6 py-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-frost-dark" />
                    <input
                      type="text"
                      placeholder="Filter repos..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-frost bg-white text-sm text-plum-dark placeholder:text-frost-dark focus:outline-none focus:ring-2 focus:ring-plum/30"
                    />
                  </div>
                  <button
                    onClick={selectAll}
                    className="text-xs font-medium text-plum hover:text-plum-dark transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-frost-dark text-xs">|</span>
                  <button
                    onClick={selectNone}
                    className="text-xs font-medium text-plum hover:text-plum-dark transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {/* Repo table */}
                {reposLoading ? (
                  <div className="flex items-center gap-2 py-8 justify-center text-frost-dark">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading repositories...</span>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {/* Table header */}
                    <div className="grid grid-cols-[40px_1fr_120px_200px_40px] gap-2 px-6 py-2 border-b border-frost bg-surface-secondary sticky top-0 z-10">
                      <div />
                      <span className="text-[11px] font-semibold text-frost-dark uppercase tracking-wider">Repository</span>
                      <span className="text-[11px] font-semibold text-frost-dark uppercase tracking-wider">Project</span>
                      <span className="text-[11px] font-semibold text-frost-dark uppercase tracking-wider">Branch</span>
                      <span className="text-[11px] font-semibold text-frost-dark uppercase tracking-wider">Link</span>
                    </div>

                    {/* Table rows */}
                    {repos
                      .filter((r) =>
                        r.name.toLowerCase().includes(repoSearch.toLowerCase()),
                      )
                      .map((repo) => {
                        const isSelected = selectedRepos.has(repo.id);
                        const branches = repoBranches[repo.id] || [];
                        const isLoadingBranches = branchLoading[repo.id];
                        const currentBranch = selectedBranches[repo.id] || repo.default_branch;
                        return (
                          <div
                            key={repo.id}
                            className={clsx(
                              'grid grid-cols-[40px_1fr_120px_200px_40px] gap-2 items-center px-6 py-2.5 border-b border-frost/50 transition-colors',
                              isSelected
                                ? 'bg-plum-50'
                                : 'hover:bg-surface-secondary',
                            )}
                          >
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleRepo(repo.id, repo.default_branch)
                              }
                              className="h-4 w-4 rounded border-frost text-plum focus:ring-plum/30 accent-plum cursor-pointer"
                            />

                            {/* Repo name */}
                            <span className="text-sm font-medium text-plum-dark truncate">
                              {repo.name}
                            </span>

                            {/* Project */}
                            <span className="text-sm text-frost-dark truncate">
                              {repo.project}
                            </span>

                            {/* Branch dropdown — always visible */}
                            <div className="flex items-center gap-1.5">
                              <GitBranch className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                              {isLoadingBranches ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-frost-dark" />
                              ) : (
                                <select
                                  value={currentBranch}
                                  onFocus={() => fetchBranchesFor(repo.id)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedBranches((sb) => ({
                                      ...sb,
                                      [repo.id]: val,
                                    }));
                                    // Auto-select the repo when branch is changed
                                    if (!selectedRepos.has(repo.id)) {
                                      setSelectedRepos((prev) => {
                                        const next = new Set(prev);
                                        next.add(repo.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  className={clsx(
                                    'text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-plum/30 max-w-[180px] truncate cursor-pointer',
                                    currentBranch !== repo.default_branch
                                      ? 'bg-plum-50 border-plum/30 text-plum font-medium'
                                      : 'bg-white border-frost text-plum-dark',
                                  )}
                                >
                                  {branches.length > 0 ? (
                                    branches.map((b) => (
                                      <option key={b.name} value={b.name}>
                                        {b.name}
                                        {b.name === repo.default_branch
                                          ? ' (default)'
                                          : ''}
                                      </option>
                                    ))
                                  ) : (
                                    <option value={repo.default_branch}>
                                      {repo.default_branch}
                                    </option>
                                  )}
                                </select>
                              )}
                            </div>

                            {/* External link */}
                            {repo.url ? (
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-frost-dark hover:text-plum transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                </svg>
                              </a>
                            ) : (
                              <div />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress card */}
          <div className="brand-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-plum-dark">
                Scan Progress
              </h3>
              <span
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  isScanning
                    ? 'bg-plum-50 text-plum'
                    : pct >= 100
                      ? 'bg-teal-50 text-teal'
                      : 'bg-surface-tertiary text-frost-dark',
                )}
              >
                {isScanning
                  ? 'In Progress'
                  : pct >= 100
                    ? 'Complete'
                    : 'Idle'}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-frost-dark">
                  {progress?.message || 'No scan running'}
                </span>
                <span className="text-xs font-mono text-frost-dark">
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isScanning
                      ? 'bg-gradient-to-r from-plum to-teal animate-pulse'
                      : pct >= 100
                        ? 'bg-teal'
                        : 'bg-frost',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-white border border-frost p-4 text-center">
                <GitBranch className="h-5 w-5 text-frost-dark mx-auto mb-1" />
                <p className="text-lg font-bold text-plum-dark">
                  {progress?.total_repos ?? 0}
                </p>
                <p className="text-xs text-frost-dark">Total Repos</p>
              </div>
              <div className="rounded-xl bg-white border border-frost p-4 text-center">
                <BarChart3 className="h-5 w-5 text-plum mx-auto mb-1" />
                <p className="text-lg font-bold text-plum-dark">
                  {progress?.scanned_repos ?? 0}
                </p>
                <p className="text-xs text-frost-dark">Scanned</p>
              </div>
              <div className="rounded-xl bg-white border border-frost p-4 text-center">
                {isScanning ? (
                  <Loader2 className="h-5 w-5 text-amber-500 mx-auto mb-1 animate-spin" />
                ) : pct >= 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-teal mx-auto mb-1" />
                ) : (
                  <XCircle className="h-5 w-5 text-frost-dark mx-auto mb-1" />
                )}
                <p className="text-lg font-bold text-plum-dark">
                  {(progress?.total_repos ?? 0) -
                    (progress?.scanned_repos ?? 0)}
                </p>
                <p className="text-xs text-frost-dark">Remaining</p>
              </div>
            </div>

            {/* Current repo */}
            {progress?.current_repo && isScanning && (
              <div className="rounded-xl bg-white border border-frost px-4 py-3 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-plum shrink-0" />
                <div>
                  <p className="text-xs text-frost-dark">Currently scanning</p>
                  <p className="text-sm font-medium text-plum-dark">
                    {progress.current_repo}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* How it works info */}
          <div className="brand-card p-6">
            <h3 className="text-sm font-semibold text-plum-dark mb-3">
              How It Works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: '1',
                  title: 'Discover',
                  desc: 'Enumerates all repositories in your Azure DevOps organization / project.',
                },
                {
                  step: '2',
                  title: 'Analyze',
                  desc: 'Inspects project files, NuGet configs, and code patterns against .NET 10 / C# 14 compliance rules.',
                },
                {
                  step: '3',
                  title: 'Report',
                  desc: 'Generates a per-repo compliance score and highlights areas needing migration.',
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl bg-white border border-frost p-4 space-y-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum-50 text-plum text-xs font-bold">
                    {s.step}
                  </div>
                  <p className="text-sm font-semibold text-plum-dark">{s.title}</p>
                  <p className="text-xs text-frost-dark leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
