'use client';

import { motion } from 'framer-motion';
import {
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { GlassCard, AnimatedCounter, ScoreRing } from '@/components/ui';
import type { DashboardSummary } from '@/lib/types';

interface SummaryCardsProps {
  data: DashboardSummary;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {/* Overall Score */}
      <GlassCard className="flex items-center gap-4">
        <ScoreRing score={data.average_score} size={72} strokeWidth={6} />
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Score</p>
          <p className="text-2xl font-bold text-white">
            <AnimatedCounter target={data.average_score} decimals={1} suffix="%" />
          </p>
        </div>
      </GlassCard>

      {/* Total Repos */}
      <GlassCard className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15">
          <GitBranch className="h-6 w-6 text-accent-blue" />
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Repositories</p>
          <p className="text-2xl font-bold text-white">
            <AnimatedCounter target={data.scanned_repositories} />
            <span className="text-sm text-slate-500 ml-1">/ {data.total_repositories}</span>
          </p>
        </div>
      </GlassCard>

      {/* Passing */}
      <GlassCard className="flex items-center gap-4" glow="emerald">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15">
          <ShieldCheck className="h-6 w-6 text-accent-emerald" />
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Passing</p>
          <p className="text-2xl font-bold text-emerald-400">
            <AnimatedCounter target={data.passing_repositories} />
          </p>
        </div>
      </GlassCard>

      {/* Failing */}
      <GlassCard className="flex items-center gap-4" glow="rose">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15">
          <ShieldAlert className="h-6 w-6 text-accent-rose" />
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Failing</p>
          <p className="text-2xl font-bold text-rose-400">
            <AnimatedCounter target={data.failing_repositories} />
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
