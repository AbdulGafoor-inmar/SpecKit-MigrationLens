'use client';

import { motion } from 'framer-motion';
import { GlassCard, ProgressBar, StatusBadge, SeverityBadge } from '@/components/ui';
import type { CategoryScore } from '@/lib/types';

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

const categoryColors: Record<string, string> = {
  'SDK & Runtime': 'bg-blue-500',
  'Language Features': 'bg-purple-500',
  'Project Configuration': 'bg-cyan-500',
  'NuGet & Dependencies': 'bg-amber-500',
  'Code Patterns': 'bg-emerald-500',
  'DevOps & CI/CD': 'bg-orange-500',
  'Performance & AOT': 'bg-rose-500',
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {categories.map((cat) => (
        <motion.div key={cat.category} variants={item}>
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">{cat.category}</h4>
              <span className="text-xs text-slate-400">
                {cat.passed}/{cat.total} passed
              </span>
            </div>
            <ProgressBar
              value={cat.score}
              color={categoryColors[cat.category] || 'bg-accent-blue'}
              showPercent
            />

            {/* Rule results */}
            <div className="mt-4 space-y-2">
              {cat.results.map((result) => (
                <div
                  key={result.rule_id}
                  className="flex items-start gap-3 py-2 border-t border-white/[0.04]"
                >
                  <StatusBadge status={result.status} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">
                        {result.rule_name}
                      </span>
                      <SeverityBadge severity={result.severity} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
