'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanProgress } from '@/lib/types';
import { getScanProgress, startScan, stopScan } from '@/lib/api';

interface UseScanReturn {
  progress: ScanProgress | null;
  isScanning: boolean;
  error: string | null;
  start: (repoIds?: string[], repoBranches?: Record<string, string>) => void;
  stop: () => void;
}

export function useScan(onComplete?: () => void): UseScanReturn {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Track when we just started a scan — ignore 'not scanning' responses briefly
  const justStartedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const p = await getScanProgress();
      setProgress(p);
      if (p.is_scanning) {
        setIsScanning(true);
        justStartedRef.current = false;
      } else if (justStartedRef.current) {
        // Backend hasn't picked up the scan yet — keep showing as scanning
        setIsScanning(true);
      } else {
        setIsScanning(false);
        stopPolling();
        onComplete?.();
      }
    } catch {
      // ignore polling errors
    }
  }, [stopPolling, onComplete]);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(poll, 2000);
    // First poll after a short delay to give backend time
    setTimeout(poll, 500);
  }, [poll, stopPolling]);

  const start = useCallback(async (repoIds?: string[], repoBranches?: Record<string, string>) => {
    setError(null);
    setIsScanning(true);
    setProgress((prev) => prev ? { ...prev, is_scanning: true, message: 'Starting scan...' } : {
      is_scanning: true, progress: 0, current_repo: null,
      total_repos: 0, scanned_repos: 0, message: 'Starting scan...',
    });
    justStartedRef.current = true;
    try {
      await startScan(undefined, undefined, repoIds, repoBranches);
      startPolling();
      // Clear the grace period after a few seconds
      setTimeout(() => { justStartedRef.current = false; }, 8000);
    } catch (err: unknown) {
      justStartedRef.current = false;
      const msg = err instanceof Error ? err.message : 'Failed to start scan';
      // If a scan is already in progress on the backend, sync our state
      if (msg.includes('already in progress') || msg.includes('409')) {
        setIsScanning(true);
        startPolling();
      } else {
        setIsScanning(false);
      }
      setError(msg);
    }
  }, [startPolling]);

  // Check if a scan is already in progress on mount
  useEffect(() => {
    getScanProgress()
      .then((p) => {
        setProgress(p);
        if (p.is_scanning) {
          setIsScanning(true);
          startPolling();
        }
      })
      .catch(() => {});

    return stopPolling;
  }, [startPolling, stopPolling]);

  const stop = useCallback(async () => {
    setError(null);
    try {
      await stopScan();
      // Poll once to update state
      setTimeout(poll, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to stop scan';
      setError(msg);
    }
  }, [poll]);

  return { progress, isScanning, error, start, stop };
}
