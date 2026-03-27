'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useDashboard } from '@/hooks/useDashboard';
import { getExportUrl } from '@/lib/api';
import {
  FileBarChart,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { RepoScanResult, CategoryScore } from '@/lib/types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-sunset bg-sunset-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-plum bg-plum-50',
};

export default function ReportsPage() {
  const { data, loading, error, refresh } = useDashboard();

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-goldenrod-50">
                <FileBarChart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-plum-dark">Reports</h2>
                <p className="text-sm text-frost-dark">
                  Compliance reports and data export
                </p>
              </div>
            </div>

            {/* Export buttons */}
            {data && (
              <div className="flex items-center gap-2">
                <a
                  href={getExportUrl('json')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-sm"
                >
                  <FileJson className="h-4 w-4" /> Export JSON
                </a>
                <a
                  href={getExportUrl('csv')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </a>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-plum" />
            </div>
          )}

          {/* Error / no data */}
          {!loading && error && (
            <div className="brand-card p-12 text-center">
              <AlertCircle className="h-10 w-10 text-frost-dark mx-auto mb-3" />
              <p className="text-frost-dark text-sm">
                No scan data available. Run a scan first to generate reports.
              </p>
            </div>
          )}

          {/* Report content */}
          {!loading && data && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Total Repositories"
                  value={data.repositories?.length ?? 0}
                  icon={<BarChart3 className="h-5 w-5 text-plum" />}
                  bg="bg-plum-50"
                />
                <SummaryCard
                  label="Average Score"
                  value={`${data.average_score?.toFixed(1) ?? 0}%`}
                  icon={<TrendingUp className="h-5 w-5 text-teal" />}
                  bg="bg-teal-50"
                />
                <SummaryCard
                  label="Passing"
                  value={data.passing_repositories ?? 0}
                  icon={<CheckCircle2 className="h-5 w-5 text-teal" />}
                  bg="bg-teal-50"
                />
                <SummaryCard
                  label="Needs Migration"
                  value={data.failing_repositories ?? 0}
                  icon={<XCircle className="h-5 w-5 text-sunset" />}
                  bg="bg-sunset-50"
                />
              </div>

              {/* Category averages */}
              {data.category_averages && Object.keys(data.category_averages).length > 0 && (
                <div className="brand-card p-6">
                  <h3 className="text-sm font-semibold text-plum-dark mb-4">
                    Category Compliance Overview
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(data.category_averages)
                      .sort(([, a], [, b]) => a - b)
                      .map(([category, score]) => (
                        <div key={category} className="flex items-center gap-4">
                          <span className="text-sm text-plum-dark/80 w-52 shrink-0 truncate">
                            {category}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all',
                                score >= 80
                                  ? 'bg-teal'
                                  : score >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-sunset',
                              )}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span
                            className={clsx(
                              'text-sm font-medium w-12 text-right',
                              score >= 80
                                ? 'text-teal'
                                : score >= 60
                                  ? 'text-amber-600'
                                  : 'text-sunset',
                            )}
                          >
                            {score.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Per-repo breakdown table */}
              <div className="brand-card p-6">
                <h3 className="text-sm font-semibold text-plum-dark mb-4">
                  Repository Compliance Detail
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-frost">
                        <th className="text-left py-3 px-3 text-frost-dark font-medium">
                          Repository
                        </th>
                        <th className="text-center py-3 px-3 text-frost-dark font-medium">
                          Score
                        </th>
                        <th className="text-center py-3 px-3 text-frost-dark font-medium">
                          Status
                        </th>
                        <th className="text-center py-3 px-3 text-frost-dark font-medium">
                          .NET Version
                        </th>
                        <th className="text-center py-3 px-3 text-frost-dark font-medium">
                          Complexity
                        </th>
                        <th className="text-left py-3 px-3 text-frost-dark font-medium">
                          Scanned
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.repositories ?? []).map((repo) => (
                        <tr
                          key={repo.repository.id}
                          className="border-b border-frost/50 table-row-hover transition-colors"
                        >
                          <td className="py-3 px-3 text-plum-dark font-medium">
                            {repo.repository.name}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={clsx(
                                'inline-block px-2 py-0.5 rounded-md text-xs font-semibold',
                                repo.overall_score >= 80
                                  ? 'bg-teal-50 text-teal'
                                  : repo.overall_score >= 60
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-sunset-50 text-sunset',
                              )}
                            >
                              {repo.overall_score.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={clsx(
                                'inline-block px-2 py-0.5 rounded-md text-xs font-medium',
                                repo.compliance_status === 'pass'
                                  ? 'bg-teal-50 text-teal'
                                  : repo.compliance_status === 'fail'
                                    ? 'bg-sunset-50 text-sunset'
                                    : 'bg-surface-tertiary text-frost-dark',
                              )}
                            >
                              {repo.compliance_status?.toUpperCase() ?? 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-plum-dark/80">
                            {repo.dotnet_version ?? '—'}
                          </td>
                          <td className="py-3 px-3 text-center text-plum-dark/80 capitalize">
                            {repo.complexity ?? '—'}
                          </td>
                          <td className="py-3 px-3 text-frost-dark text-xs">
                            {repo.scan_timestamp
                              ? new Date(repo.scan_timestamp).toLocaleString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                      {(!data.repositories || data.repositories.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-frost-dark">
                            No repository data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="brand-card p-4 flex items-center gap-4">
      <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', bg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-plum-dark">{value}</p>
        <p className="text-xs text-frost-dark">{label}</p>
      </div>
    </div>
  );
}
