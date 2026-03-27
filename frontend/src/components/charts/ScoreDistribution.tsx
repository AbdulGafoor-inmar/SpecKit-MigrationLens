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
  if (score >= 80) return '#03878C';
  if (score >= 60) return '#FFC20E';
  if (score >= 40) return '#F15A22';
  return '#E04060';
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
      <h3 className="text-sm font-semibold text-plum-dark mb-4">Score Distribution (Top 15)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDEDF6" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#A0A0B5', fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#1D1655', fontSize: 11 }}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DEDCE4',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#1D1655',
              boxShadow: '0 4px 12px rgba(48,53,132,0.08)',
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
