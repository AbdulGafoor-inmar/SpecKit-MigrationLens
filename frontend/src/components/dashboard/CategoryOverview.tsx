'use client';

import { GlassCard, ProgressBar } from '@/components/ui';
import type { DashboardSummary } from '@/lib/types';

interface CategoryOverviewProps {
  data: DashboardSummary;
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

export function CategoryOverview({ data }: CategoryOverviewProps) {
  const categories = Object.entries(data.category_averages).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-white mb-4">Category Averages</h3>
      <div className="space-y-3">
        {categories.map(([category, score]) => (
          <ProgressBar
            key={category}
            label={category}
            value={score}
            color={categoryColors[category] || 'bg-accent-blue'}
          />
        ))}
      </div>
    </GlassCard>
  );
}
