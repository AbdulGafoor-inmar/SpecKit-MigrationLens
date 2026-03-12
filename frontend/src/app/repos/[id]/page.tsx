'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, GitBranch, Clock, HardDrive, Bug } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlassCard, ScoreRing, StatusBadge } from '@/components/ui';
import { CategoryBreakdown } from '@/components/detail/CategoryBreakdown';
import { useRepoDetail } from '@/hooks/useRepoDetail';
import { createWorkItem } from '@/lib/api';
import type { CreateStoryRequest } from '@/lib/types';
import { useState } from 'react';

export default function RepoDetailPage() {
  const params = useParams();
  const repoId = params.id as string;
  const { data, loading, error } = useRepoDetail(repoId);
  const [workItemUrl, setWorkItemUrl] = useState<string | null>(null);
  const [creatingWI, setCreatingWI] = useState(false);

  const handleCreateWorkItem = async () => {
    if (!data) return;
    setCreatingWI(true);
    try {
      const failingRules = data.categories
        .flatMap((c) => c.results)
        .filter((r) => r.status === 'fail')
        .map((r) => r.rule_id);

      const payload: CreateStoryRequest = {
        repo_id: data.repository.id,
        repo_name: data.repository.name,
        failing_rules: failingRules,
        overall_score: data.overall_score,
      };

      const result = await createWorkItem(payload);
      setWorkItemUrl(result.url);
    } catch {
      alert('Failed to create work item');
    } finally {
      setCreatingWI(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-56">
        <Header />

        <main className="px-6 py-6 space-y-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="glass p-8 text-center">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {data && (
            <>
              {/* Repo header */}
              <div className="flex flex-col lg:flex-row items-start gap-6">
                <GlassCard hover={false} className="flex-1 w-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-accent-blue" />
                        {data.repository.name}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {data.scan_timestamp
                            ? new Date(data.scan_timestamp).toLocaleDateString()
                            : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5" />
                          {(data.repository.size_kb / 1024).toFixed(1)} MB
                        </span>
                        {data.repository.url && (
                          <a
                            href={data.repository.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent-blue hover:text-blue-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> ADO
                          </a>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={data.compliance_status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">.NET</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {data.dotnet_version || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">C#</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {data.csharp_version || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Complexity</p>
                      <p className="text-sm font-semibold text-white mt-0.5 capitalize">
                        {data.complexity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Branch</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {data.repository.default_branch}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard hover={false} className="flex flex-col items-center w-full lg:w-56">
                  <ScoreRing score={data.overall_score} size={100} strokeWidth={8} />
                  <div className="mt-4 w-full space-y-2">
                    <button
                      onClick={handleCreateWorkItem}
                      disabled={creatingWI || data.compliance_status === 'pass'}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-accent-amber/15 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Bug className="h-4 w-4" />
                      {creatingWI ? 'Creating...' : 'Create Work Item'}
                    </button>
                    {workItemUrl && (
                      <a
                        href={workItemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs text-accent-blue hover:text-blue-300"
                      >
                        View in ADO
                      </a>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Category breakdown */}
              <CategoryBreakdown categories={data.categories} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
