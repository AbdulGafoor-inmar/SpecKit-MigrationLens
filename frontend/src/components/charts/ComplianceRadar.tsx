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
      <h3 className="text-sm font-semibold text-plum-dark mb-4">Compliance Radar</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#DEDCE4" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#A0A0B5', fontSize: 10 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#A0A0B5', fontSize: 9 }}
            tickCount={5}
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
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#303584"
            fill="#303584"
            fillOpacity={0.12}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
