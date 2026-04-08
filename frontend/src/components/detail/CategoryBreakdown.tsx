'use client';

import { motion } from 'framer-motion';
import { GlassCard, ProgressBar } from '@/components/ui';
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
  'AKS & Kubernetes': 'bg-violet-500',
  'Configuration': 'bg-teal',
  'Logging & Monitoring': 'bg-amber-500',
  'Performance': 'bg-rose-500',
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
                {cat.passed}/{cat.total_rules} passed
                {cat.not_applicable > 0 && ` · ${cat.not_applicable} N/A`}
              </span>
            </div>
            <ProgressBar
              value={cat.score}
              color={categoryColors[cat.category] || 'bg-plum'}
              showPercent
            />
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
