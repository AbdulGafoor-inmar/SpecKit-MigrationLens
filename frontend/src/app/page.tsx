'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { RepoTable } from '@/components/dashboard/RepoTable';
import { CategoryOverview } from '@/components/dashboard/CategoryOverview';
import { ScanButton } from '@/components/scan/ScanButton';
import { ScanProgressPanel } from '@/components/scan/ScanProgressPanel';
import { ComplianceRadar } from '@/components/charts/ComplianceRadar';
import { VersionPieChart } from '@/components/charts/VersionPieChart';
import { ScoreDistribution } from '@/components/charts/ScoreDistribution';
import { useDashboard } from '@/hooks/useDashboard';
import { useScan } from '@/hooks/useScan';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { getExportUrl } from '@/lib/api';

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();
  const { progress, isScanning, error: scanError, start } = useScan(refresh);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-56">
        <Header onRefresh={refresh} isScanning={isScanning} />

        <main className="px-6 py-6 space-y-6">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Dashboard</h2>
              {data && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {data.organization} / {data.project}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Export buttons */}
              {data && (
                <div className="flex items-center gap-2">
                  <a
                    href={getExportUrl('json')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/[0.10] hover:text-white transition-all"
                  >
                    <FileJson className="h-3.5 w-3.5" /> JSON
                  </a>
                  <a
                    href={getExportUrl('csv')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-white/[0.06] border border-white/[0.08] text-slate-300 hover:bg-white/[0.10] hover:text-white transition-all"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                  </a>
                </div>
              )}
              <ScanButton onScan={start} isScanning={isScanning} />
            </div>
          </div>

          {/* Scan progress */}
          <ScanProgressPanel progress={progress} isScanning={isScanning} />

          {/* Error states */}
          {scanError && (
            <div className="glass p-4 border-rose-500/20 text-rose-400 text-sm">
              Scan error: {scanError}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
            </div>
          )}

          {/* Empty state */}
          {!loading && error && (
            <div className="glass p-12 text-center">
              <p className="text-slate-400 text-sm mb-4">
                No scan data available. Run a scan to get started.
              </p>
              <ScanButton onScan={start} isScanning={isScanning} />
            </div>
          )}

          {/* Dashboard content */}
          {!loading && data && (
            <>
              <SummaryCards data={data} />

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <RepoTable repos={data.repositories} />
                </div>
                <div>
                  <CategoryOverview data={data} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
