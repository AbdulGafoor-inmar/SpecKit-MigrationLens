'use client';

import { motion } from 'framer-motion';
import { GlassCard, ProgressBar, StatusBadge, SeverityBadge } from '@/components/ui';
import type { CategoryScore } from '@/lib/types';

interface CategoryBreakdownProps {
  categories: CategoryScore[];
}

const categoryColors: Record<string, string> = {
  'SDK & Runtime': 'bg-plum',
  'Language Features': 'bg-plum-300',
  'Project Configuration': 'bg-teal',
  'NuGet & Dependencies': 'bg-goldenrod',
  'Code Patterns': 'bg-teal-300',
  'DevOps & CI/CD': 'bg-sunset',
  'Performance & AOT': 'bg-sunset-300',
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
              <h4 className="text-sm font-semibold text-plum-dark">{cat.category}</h4>
              <span className="text-xs text-frost-dark">
                {cat.passed}/{cat.total} passed
              </span>
            </div>
            <ProgressBar
              value={cat.score}
              color={categoryColors[cat.category] || 'bg-plum'}
              showPercent
            />

            {/* Rule results */}
            <div className="mt-4 space-y-2">
              {cat.results.map((result) => (
                <div
                  key={result.rule_id}
                  className="flex items-start gap-3 py-2 border-t border-frost/50"
                >
                  <StatusBadge status={result.status} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-plum-dark font-medium">
                        {result.rule_name}
                      </span>
                      <SeverityBadge severity={result.severity} />
                    </div>
                    <p className="text-xs text-frost-dark mt-0.5 truncate">
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
