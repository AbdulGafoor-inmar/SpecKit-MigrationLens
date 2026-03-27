'use client';

import { useState, useMemo, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { RepoTable } from '@/components/dashboard/RepoTable';
import { CategoryOverview } from '@/components/dashboard/CategoryOverview';
import { ScanProgressPanel } from '@/components/scan/ScanProgressPanel';
import { ComplianceRadar } from '@/components/charts/ComplianceRadar';
import { VersionPieChart } from '@/components/charts/VersionPieChart';
import { ScoreDistribution } from '@/components/charts/ScoreDistribution';
import { useDashboard } from '@/hooks/useDashboard';
import { useRepoList } from '@/hooks/useRepoList';
import { useScan } from '@/hooks/useScan';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  ScanLine,
  Search,
  GitBranch,
  CheckSquare,
  Square,
  Minus,
  Loader2,
  AlertCircle,
  ExternalLink,
  StopCircle,
} from 'lucide-react';
import { getExportUrl } from '@/lib/api';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const { data, loading: dashboardLoading, error: dashboardError, refresh } = useDashboard();
  const { repos, loading: reposLoading, error: reposError, refresh: refreshRepos } = useRepoList();
  const onScanComplete = useCallback(() => { refresh(); refreshRepos(); }, [refresh, refreshRepos]);
  const { progress, isScanning, error: scanError, start, stop } = useScan(onScanComplete);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Filtered repos ── */
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repos;
    const q = searchQuery.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.project.toLowerCase().includes(q),
    );
  }, [repos, searchQuery]);

  /* ── Selection helpers ── */
  const allFilteredSelected =
    filteredRepos.length > 0 && filteredRepos.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    filteredRepos.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  function toggleRepo(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRepos.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRepos.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  function handleStartScan() {
    const ids = Array.from(selectedIds);
    start(ids.length > 0 ? ids : undefined);
  }

  const hasResults = !dashboardLoading && data && data.total_repositories > 0;

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={() => { refreshRepos(); refresh(); }} isScanning={isScanning} />

        <main className="px-6 py-6 space-y-6">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-plum-dark">Dashboard</h2>
              {data && (
                <p className="text-[13px] text-frost-dark mt-0.5 font-medium">
                  {data.organization} <span className="text-plum-200">/</span> {data.project}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Export buttons */}
              {hasResults && (
                <div className="flex items-center gap-2">
                  <a
                    href={getExportUrl('json')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-xs"
                  >
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </a>
                  <a
                    href={getExportUrl('csv')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost text-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </a>
                </div>
              )}

              {/* Scan / Stop button */}
              <div className="flex items-center gap-2">
                {isScanning && (
                  <button
                    onClick={stop}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-sunset-50 text-sunset border border-sunset-200 hover:bg-sunset-100 transition-all duration-300"
                  >
                    <StopCircle className="h-4 w-4" />
                    Stop Scan
                  </button>
                )}
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                    isScanning
                      ? 'bg-surface-tertiary text-frost-dark cursor-not-allowed'
                      : 'btn-primary',
                  )}
                >
                  <ScanLine className="h-4 w-4" />
                  {selectedIds.size > 0
                    ? `Scan ${selectedIds.size} Repo${selectedIds.size > 1 ? 's' : ''}`
                    : 'Scan All'}
                </button>
              </div>
            </div>
          </div>

          {/* Scan progress */}
          <ScanProgressPanel progress={progress} isScanning={isScanning} />

          {/* Scan error */}
          {scanError && (
            <div className="brand-card !p-4 border-sunset-200 text-sunset text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Scan error: {scanError}
            </div>
          )}

          {/* ── Repository Selection Panel ── */}
          <div className="brand-card !p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-frost flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum-50">
                  <GitBranch className="h-3.5 w-3.5 text-plum" />
                </div>
                <h3 className="text-[13px] font-semibold text-plum-dark">
                  Select Repositories
                </h3>
                {!reposLoading && (
                  <span className="text-[11px] text-frost-dark font-medium">
                    {repos.length} found
                    {selectedIds.size > 0 && (
                      <span className="text-plum ml-1.5">
                        &middot; {selectedIds.size} selected
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-frost-dark" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter repos..."
                  className="w-56 rounded-lg bg-surface-secondary border border-frost pl-9 pr-3 py-1.5 text-xs text-plum-dark placeholder-frost-dark focus:outline-none focus:ring-1 focus:ring-plum/30 focus:border-plum-200 transition-all duration-300"
                />
              </div>
            </div>

            {/* Loading repos */}
            {reposLoading && (
              <div className="px-6 py-12 flex items-center justify-center gap-2 text-frost-dark">
                <Loader2 className="h-5 w-5 animate-spin text-plum" />
                <span className="text-sm">Loading repositories from Azure DevOps...</span>
              </div>
            )}

            {/* Error loading repos */}
            {reposError && !reposLoading && (
              <div className="px-6 py-8 flex items-center justify-center gap-2 text-sunset">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{reposError}</span>
              </div>
            )}

            {/* Repo table */}
            {!reposLoading && !reposError && (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-frost text-left">
                      <th className="px-6 py-3 w-10">
                        <button onClick={toggleAll} className="text-frost-dark hover:text-plum transition-colors">
                          {allFilteredSelected ? (
                            <CheckSquare className="h-4 w-4 text-plum" />
                          ) : someFilteredSelected ? (
                            <Minus className="h-4 w-4 text-plum" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-frost-dark uppercase tracking-[0.12em]">
                        Repository
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-frost-dark uppercase tracking-[0.12em]">
                        Project
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-frost-dark uppercase tracking-[0.12em]">
                        Default Branch
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-frost-dark uppercase tracking-[0.12em]">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-frost/50">
                    {filteredRepos.map((repo) => {
                      const checked = selectedIds.has(repo.id);
                      return (
                        <tr
                          key={repo.id}
                          onClick={() => toggleRepo(repo.id)}
                          className={clsx(
                            'cursor-pointer table-row-hover',
                            checked
                              ? 'bg-plum-50/50'
                              : '',
                          )}
                        >
                          <td className="px-6 py-2.5">
                            {checked ? (
                              <CheckSquare className="h-4 w-4 text-plum" />
                            ) : (
                              <Square className="h-4 w-4 text-frost-dark" />
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-plum-dark text-[13px]">{repo.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-frost-dark text-[13px]">{repo.project}</td>
                          <td className="px-4 py-2.5 text-frost-dark text-xs font-mono">
                            {repo.default_branch}
                          </td>
                          <td className="px-4 py-2.5">
                            {repo.url && (
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-frost-dark hover:text-plum transition-colors duration-300"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRepos.length === 0 && !reposLoading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-frost-dark text-sm"
                        >
                          {searchQuery
                            ? 'No repositories match your search.'
                            : 'No repositories found in the organization.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Dashboard Results (shown after scan data exists) ── */}

          {/* Loading dashboard data */}
          {dashboardLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-plum-100 border-t-plum" />
            </div>
          )}

          {/* Empty state — no scan data yet */}
          {!dashboardLoading && !hasResults && !dashboardError && (
            <div className="brand-card !p-16 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-plum-50 mx-auto">
                <ScanLine className="h-7 w-7 text-plum-200" />
              </div>
              <div>
                <p className="text-plum-dark text-sm font-medium">No scan results yet</p>
                <p className="text-frost-dark text-[13px] mt-1">
                  Select repositories above and click{' '}
                  <span className="text-plum font-semibold">Scan</span> to begin analysis.
                </p>
              </div>
            </div>
          )}

          {/* Dashboard content */}
          {hasResults && (
            <>
              <SummaryCards data={data} />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2">
                  <RepoTable repos={data.repositories} />
                </div>
                <div>
                  <CategoryOverview data={data} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                <ComplianceRadar data={data} />
                <VersionPieChart repos={data.repositories} />
                <ScoreDistribution repos={data.repositories} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
