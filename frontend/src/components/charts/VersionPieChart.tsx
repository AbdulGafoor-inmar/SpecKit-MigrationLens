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

const COLORS = ['#60A5FA', '#A78BFA', '#34D399', '#FBBF24', '#FB7185', '#22D3EE', '#F97316'];

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
      <h3 className="text-sm font-semibold text-white mb-4">.NET Version Distribution</h3>
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
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
