'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { GlassCard } from '@/components/ui';
import type { RepoScanResult } from '@/lib/types';

interface VersionPieChartProps {
  repos: RepoScanResult[];
}

const COLORS = ['#303584', '#03878C', '#F15A22', '#FFC20E', '#1D1655', '#4A4FB0', '#05A5AB'];

export function VersionPieChart({ repos }: VersionPieChartProps) {
  const versionCounts = repos.reduce<Record<string, number>>((acc, repo) => {
    const v = repo.dotnet_version || 'Unknown';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(versionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-plum-dark mb-4">.NET Version Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DEDCE4',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#1D1655',
              boxShadow: '0 4px 12px rgba(48,53,132,0.08)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#A0A0B5' }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
