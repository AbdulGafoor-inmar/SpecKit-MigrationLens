'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WikiInfo, WikiPage, WikiPageListResponse } from '@/lib/types';
import { listWikis, getWikiPage, listWikiPages } from '@/lib/api';

interface UseWikiListReturn {
  wikis: WikiInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWikiList(project?: string): UseWikiListReturn {
  const [wikis, setWikis] = useState<WikiInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWikis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWikis(project);
      setWikis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load wikis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    fetchWikis();
  }, [fetchWikis]);

  return { wikis, loading, error, refresh: fetchWikis };
}

interface UseWikiPageReturn {
  page: WikiPage | null;
  loading: boolean;
  error: string | null;
  loadPage: (path: string) => void;
}

export function useWikiPage(
  wikiId: string,
  initialPath: string = '/',
  project?: string,
): UseWikiPageReturn {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (path: string) => {
      if (!wikiId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getWikiPage(wikiId, path, project);
        setPage(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load wiki page';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [wikiId, project],
  );

  useEffect(() => {
    if (wikiId) {
      loadPage(initialPath);
    }
  }, [wikiId, initialPath, loadPage]);

  return { page, loading, error, loadPage };
}

interface UseWikiPagesReturn {
  data: WikiPageListResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWikiPages(
  wikiId: string,
  path: string = '/',
  project?: string,
): UseWikiPagesReturn {
  const [data, setData] = useState<WikiPageListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!wikiId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listWikiPages(wikiId, path, project);
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load wiki pages';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [wikiId, path, project]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { data, loading, error, refresh: fetchPages };
}
