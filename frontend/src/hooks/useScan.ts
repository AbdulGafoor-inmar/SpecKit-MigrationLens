'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScanProgress } from '@/lib/types';
import { getScanProgress, startScan } from '@/lib/api';

interface UseScanReturn {
  progress: ScanProgress | null;
  isScanning: boolean;
  error: string | null;
  start: () => void;
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
      if (!p.is_scanning) {
        setIsScanning(false);
        stopPolling();
        onComplete?.();
      }
    } catch {
      // ignore polling errors
    }
  }, [stopPolling, onComplete]);

  const start = useCallback(async () => {
    setError(null);
    try {
      await startScan();
      setIsScanning(true);
      // poll every 2 seconds
      intervalRef.current = setInterval(poll, 2000);
      poll(); // immediate first check
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start scan';
      setError(msg);
    }
  }, [poll]);

  // Check if a scan is already in progress on mount
  useEffect(() => {
    getScanProgress()
      .then((p) => {
        setProgress(p);
        if (p.is_scanning) {
          setIsScanning(true);
          intervalRef.current = setInterval(poll, 2000);
        }
      })
      .catch(() => {});

    return stopPolling;
  }, [poll, stopPolling]);

  return { progress, isScanning, error, start };
}
