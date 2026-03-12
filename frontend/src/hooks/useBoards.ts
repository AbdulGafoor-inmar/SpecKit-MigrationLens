'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BoardInfo, BoardDetailResponse, WorkItemQueryResponse } from '@/lib/types';
import { listBoards, getBoardDetail, listWorkItems } from '@/lib/api';

interface UseBoardListReturn {
  boards: BoardInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBoardList(project?: string, team?: string): UseBoardListReturn {
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBoards(project, team);
      setBoards(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load boards';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [project, team]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  return { boards, loading, error, refresh: fetchBoards };
}

interface UseBoardDetailReturn {
  data: BoardDetailResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBoardDetail(
  boardName: string,
  project?: string,
  team?: string,
): UseBoardDetailReturn {
  const [data, setData] = useState<BoardDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!boardName) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getBoardDetail(boardName, project, team);
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load board';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [boardName, project, team]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, loading, error, refresh: fetchDetail };
}

interface UseWorkItemsReturn {
  data: WorkItemQueryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkItems(
  project?: string,
  workItemType: string = 'User Story',
  state?: string,
  tags?: string,
): UseWorkItemsReturn {
  const [data, setData] = useState<WorkItemQueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWorkItems(project, workItemType, state, tags);
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load work items';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [project, workItemType, state, tags]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { data, loading, error, refresh: fetchItems };
}
