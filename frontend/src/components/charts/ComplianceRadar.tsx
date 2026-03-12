'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { GlassCard } from '@/components/ui';
import type { DashboardSummary } from '@/lib/types';

interface ComplianceRadarProps {
  data: DashboardSummary;
}

export function ComplianceRadar({ data }: ComplianceRadarProps) {
  const chartData = Object.entries(data.category_averages).map(([category, score]) => ({
    category: category.replace('&', '\n&'),
    score: Math.round(score),
    fullMark: 100,
  }));

  return (
    <GlassCard hover={false}>
      <h3 className="text-sm font-semibold text-white mb-4">Compliance Radar</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#475569', fontSize: 9 }}
            tickCount={5}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#F1F5F9',
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#60A5FA"
            fill="#60A5FA"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
