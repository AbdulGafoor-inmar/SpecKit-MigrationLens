'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { startScan, getScanProgress, stopScan } from '@/lib/api';
import type { ScanProgress } from '@/lib/types';
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
} from 'lucide-react';
import { clsx } from 'clsx';

export default function ScanPage() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      await startScan();
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
