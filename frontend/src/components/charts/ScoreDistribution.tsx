'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui';
import type { RepoScanResult } from '@/lib/types';

interface ScoreDistributionProps {
  repos: RepoScanResult[];
}

function getBarColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 60) return '#FBBF24';
  if (score >= 40) return '#FB923C';
  return '#FB7185';
}

export function ScoreDistribution({ repos }: ScoreDistributionProps) {
  const chartData = repos
    .map((r) => ({
      name: r.repository.name.length > 15
        ? r.repository.name.slice(0, 15) + '…'
        : r.repository.name,
      score: Math.round(r.overall_score),
      fullName: r.repository.name,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-white mb-4">Score Distribution (Top 15)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#CBD5E1', fontSize: 11 }}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
            formatter={(value: number) => [`${value}%`, 'Score']}
            labelFormatter={(label: string) => {
              const item = chartData.find((d) => d.name === label);
              return item?.fullName || label;
            }}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
