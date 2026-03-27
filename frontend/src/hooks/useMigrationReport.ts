'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MigrationReport } from '@/lib/types';
import { getMigrationReport } from '@/lib/api';

interface UseMigrationReportReturn {
  report: MigrationReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMigrationReport(repoId: string): UseMigrationReportReturn {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMigrationReport(repoId);
      setReport(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load migration report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refresh: fetchReport };
}
