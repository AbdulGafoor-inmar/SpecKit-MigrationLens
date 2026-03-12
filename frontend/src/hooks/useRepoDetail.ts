'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RepoScanResult } from '@/lib/types';
import { getRepoDetail } from '@/lib/api';

interface UseRepoDetailReturn {
  data: RepoScanResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRepoDetail(repoId: string): UseRepoDetailReturn {
  const [data, setData] = useState<RepoScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRepoDetail(repoId);
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load repository';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
