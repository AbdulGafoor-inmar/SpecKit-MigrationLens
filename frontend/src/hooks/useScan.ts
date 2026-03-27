'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanProgress } from '@/lib/types';
import { getScanProgress, startScan, stopScan } from '@/lib/api';

interface UseScanReturn {
  progress: ScanProgress | null;
  isScanning: boolean;
  error: string | null;
  start: (repoIds?: string[]) => void;
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

  const poll = useCallback(async () => {
    try {
      const p = await getScanProgress();
      setProgress(p);
      if (p.is_scanning) {
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
    poll();
  }, [poll, stopPolling]);

  const start = useCallback(async (repoIds?: string[]) => {
    setError(null);
    setIsScanning(true);
    try {
      await startScan(undefined, undefined, repoIds);
      startPolling();
    } catch (err: unknown) {
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
