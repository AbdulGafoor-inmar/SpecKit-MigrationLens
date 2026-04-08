'use client';

import { GlassCard, ProgressBar } from '@/components/ui';
import type { DashboardSummary, CategoryScore } from '@/lib/types';

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
  'AKS & Kubernetes': 'bg-violet-500',
  'Configuration': 'bg-teal',
  'Logging & Monitoring': 'bg-amber-500',
  'Performance': 'bg-rose-500',
  'Performance & AOT': 'bg-sunset-300',
};

export function CategoryOverview({ data }: CategoryOverviewProps) {
  // Build aggregated rule counts per category across all repos
  const catCounts: Record<string, { passed: number; failed: number; na: number }> = {};
  for (const repo of data.repositories) {
    for (const cat of repo.categories ?? []) {
      if (!catCounts[cat.category]) {
        catCounts[cat.category] = { passed: 0, failed: 0, na: 0 };
      }
      catCounts[cat.category].passed += cat.passed;
      catCounts[cat.category].failed += cat.failed;
      catCounts[cat.category].na += cat.not_applicable;
    }
  }

  // Build merged list: start from category_averages, add any repo-level categories not already present
  const allCategories: [string, number][] = Object.entries(data.category_averages);
  for (const cat of Object.keys(catCounts)) {
    if (!data.category_averages.hasOwnProperty(cat)) {
      allCategories.push([cat, 0]);
    }
  }
  // Sort: evaluated categories first (by score desc), then all-NA at the bottom
  allCategories.sort(([catA, a], [catB, b]) => {
    const evalA = catCounts[catA] ? catCounts[catA].passed + catCounts[catA].failed : 0;
    const evalB = catCounts[catB] ? catCounts[catB].passed + catCounts[catB].failed : 0;
    if (evalA > 0 && evalB === 0) return -1;
    if (evalA === 0 && evalB > 0) return 1;
    return b - a;
  });

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-plum-dark mb-4">Category Averages</h3>
      <div className="space-y-3">
        {allCategories.map(([category, score]) => {
          const counts = catCounts[category];
          const evaluated = counts ? counts.passed + counts.failed : 0;
          const isAllNA = evaluated === 0;
          return (
            <div key={category} className={isAllNA ? 'opacity-50' : undefined}>
              <ProgressBar
                label={category}
                value={score}
                color={isAllNA ? 'bg-frost-dark/30' : (categoryColors[category] || 'bg-plum')}
              />
              <p className="text-[10px] text-frost-dark mt-0.5 ml-0.5">
                {isAllNA ? (
                  <span className="italic">N/A — not applicable</span>
                ) : (
                  <>
                    {counts!.passed}/{evaluated} rules passing
                    {counts!.na > 0 && (
                      <span className="text-frost-dark/60"> · {counts!.na} N/A</span>
                    )}
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
