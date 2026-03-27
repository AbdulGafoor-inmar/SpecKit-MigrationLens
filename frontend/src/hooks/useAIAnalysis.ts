'use client';

import { useState, useCallback } from 'react';
import { getAIAnalysis } from '@/lib/api';
import type { AIAnalysisResponse } from '@/lib/types';

export function useAIAnalysis(repoId: string) {
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAIAnalysis(repoId);
      setAnalysis(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI analysis failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  return { analysis, loading, error, runAnalysis };
}
