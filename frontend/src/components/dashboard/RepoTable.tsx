'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import { StatusBadge, ScoreRing } from '@/components/ui';
import type { RepoScanResult } from '@/lib/types';

interface RepoTableProps {
  repos: RepoScanResult[];
}

const rowVariant = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export function RepoTable({ repos }: RepoTableProps) {
  return (
    <div className="glass overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Repository Compliance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left">
              <th className="px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Repository
              </th>
              <th className="px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                .NET Version
              </th>
              <th className="px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                Complexity
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <motion.tbody
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.04 }}
          >
            {repos.map((repo) => (
              <motion.tr
                key={repo.repository.id}
                variants={rowVariant}
                className="table-row-hover border-b border-white/[0.03]"
              >
                <td className="px-6 py-3">
                  <span className="font-medium text-white">{repo.repository.name}</span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <ScoreRing score={repo.overall_score} size={32} strokeWidth={3} showLabel={false} />
                    <span
                      className={clsx('font-semibold', {
                        'text-emerald-400': repo.overall_score >= 80,
                        'text-amber-400': repo.overall_score >= 60 && repo.overall_score < 80,
                        'text-orange-400': repo.overall_score >= 40 && repo.overall_score < 60,
                        'text-rose-400': repo.overall_score < 40,
                      })}
                    >
                      {Math.round(repo.overall_score)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={repo.compliance_status} />
                </td>
                <td className="px-6 py-3 text-slate-300">
                  {repo.dotnet_version || '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={clsx('text-xs font-medium px-2 py-0.5 rounded', {
                      'text-emerald-400 bg-emerald-500/10': repo.complexity === 'simple',
                      'text-amber-400 bg-amber-500/10': repo.complexity === 'moderate',
                      'text-rose-400 bg-rose-500/10': repo.complexity === 'complex',
                    })}
                  >
                    {repo.complexity}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <Link
                    href={`/repos/${repo.repository.id}`}
                    className="inline-flex items-center gap-1 text-xs text-accent-blue hover:text-blue-300 transition-colors"
                  >
                    Details <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
