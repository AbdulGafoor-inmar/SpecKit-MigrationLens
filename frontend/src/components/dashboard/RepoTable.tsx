'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Globe, Clock, Cog, Library } from 'lucide-react';
import { clsx } from 'clsx';
import { StatusBadge, ScoreRing } from '@/components/ui';
import type { RepoScanResult, AppType } from '@/lib/types';

interface RepoTableProps {
  repos: RepoScanResult[];
}

const appTypeConfig: Record<AppType, { label: string; color: string; icon: typeof Globe }> = {
  api:     { label: 'API',     color: 'text-plum bg-plum-50',              icon: Globe },
  cronjob: { label: 'CronJob', color: 'text-goldenrod bg-goldenrod-50',    icon: Clock },
  worker:  { label: 'Worker',  color: 'text-plum-300 bg-plum-50',          icon: Cog },
  library: { label: 'Library', color: 'text-frost-dark bg-surface-tertiary', icon: Library },
};

function AppTypeBadge({ type }: { type: AppType }) {
  const config = appTypeConfig[type] || appTypeConfig.library;
  const Icon = config.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

const rowVariant = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export function RepoTable({ repos }: RepoTableProps) {
  return (
    <div className="brand-card overflow-hidden">
      <div className="px-6 py-4 border-b border-frost">
        <h3 className="text-sm font-semibold text-plum-dark">Repository Compliance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-frost text-left">
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
                Repository
              </th>
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
                .NET Version
              </th>
              <th className="px-6 py-3 text-xs font-medium text-frost-dark uppercase tracking-wider">
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
                className="table-row-hover border-b border-frost/50"
              >
                <td className="px-6 py-3">
                  <span className="font-medium text-plum-dark">{repo.repository.name}</span>
                </td>
                <td className="px-6 py-3">
                  <AppTypeBadge type={repo.repository.app_type || 'api'} />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <ScoreRing score={repo.overall_score} size={32} strokeWidth={3} showLabel={false} />
                    <div>
                      <span
                        className={clsx('font-semibold', {
                          'text-teal': repo.overall_score >= 80,
                          'text-goldenrod': repo.overall_score >= 60 && repo.overall_score < 80,
                          'text-sunset': repo.overall_score >= 40 && repo.overall_score < 60,
                          'text-red-500': repo.overall_score < 40,
                        })}
                      >
                        {Math.round(repo.overall_score)}%
                      </span>
                      {repo.categories && (() => {
                        const totals = repo.categories.reduce(
                          (acc, c) => ({ p: acc.p + c.passed, f: acc.f + c.failed, n: acc.n + c.not_applicable }),
                          { p: 0, f: 0, n: 0 },
                        );
                        const evaluated = totals.p + totals.f;
                        return evaluated > 0 ? (
                          <p className="text-[10px] text-frost-dark leading-tight mt-0.5">
                            {totals.p}/{evaluated} rules
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={repo.compliance_status} />
                </td>
                <td className="px-6 py-3 text-plum-dark/80">
                  {repo.dotnet_version || '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={clsx('text-xs font-medium px-2 py-0.5 rounded', {
                      'text-teal bg-teal-50': repo.complexity === 'simple',
                      'text-goldenrod bg-goldenrod-50': repo.complexity === 'moderate',
                      'text-sunset bg-sunset-50': repo.complexity === 'complex',
                    })}
                  >
                    {repo.complexity}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <Link
                    href={`/repos/${repo.repository.id}`}
                    className="inline-flex items-center gap-1 text-xs text-plum hover:text-teal transition-colors"
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
