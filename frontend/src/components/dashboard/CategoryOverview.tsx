'use client';

import { GlassCard, ProgressBar } from '@/components/ui';
import type { DashboardSummary } from '@/lib/types';

interface CategoryOverviewProps {
  data: DashboardSummary;
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

export function CategoryOverview({ data }: CategoryOverviewProps) {
  const categories = Object.entries(data.category_averages).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-plum-dark mb-4">Category Averages</h3>
      <div className="space-y-3">
        {categories.map(([category, score]) => (
          <ProgressBar
            key={category}
            label={category}
            value={score}
            color={categoryColors[category] || 'bg-plum'}
          />
        ))}
      </div>
    </GlassCard>
  );
}
