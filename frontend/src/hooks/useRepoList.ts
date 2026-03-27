'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ADORepository } from '@/lib/types';
import { listRepos } from '@/lib/api';

interface UseRepoListReturn {
  repos: ADORepository[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRepoList(): UseRepoListReturn {
  const [repos, setRepos] = useState<ADORepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRepos();
      setRepos(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { repos, loading, error, refresh: fetch };
}
