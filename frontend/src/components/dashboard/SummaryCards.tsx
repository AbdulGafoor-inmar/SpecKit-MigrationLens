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
  show: { transition: { staggerChildren: 0.12 } },
};

export function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
    >
      {/* Overall Score */}
      <GlassCard className="flex items-center gap-5" glow="purple">
        <ScoreRing score={data.average_score} size={72} strokeWidth={6} />
        <div>
          <p className="text-[11px] text-frost-dark uppercase tracking-[0.12em] font-medium mb-1">Avg Score</p>
          <p className="text-2xl font-bold text-plum-dark tabular-nums">
            <AnimatedCounter target={data.average_score} decimals={1} suffix="%" />
          </p>
        </div>
      </GlassCard>

      {/* Total Repos */}
      <GlassCard className="flex items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-plum-50">
          <GitBranch className="h-5 w-5 text-plum" />
        </div>
        <div>
          <p className="text-[11px] text-frost-dark uppercase tracking-[0.12em] font-medium mb-1">Repositories</p>
          <p className="text-2xl font-bold text-plum-dark tabular-nums">
            <AnimatedCounter target={data.scanned_repositories} />
            <span className="text-sm text-frost-dark ml-1.5 font-medium">/ {data.total_repositories}</span>
          </p>
        </div>
      </GlassCard>

      {/* Passing */}
      <GlassCard className="flex items-center gap-5" glow="teal">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
          <ShieldCheck className="h-5 w-5 text-teal" />
        </div>
        <div>
          <p className="text-[11px] text-frost-dark uppercase tracking-[0.12em] font-medium mb-1">Passing</p>
          <p className="text-2xl font-bold text-teal tabular-nums">
            <AnimatedCounter target={data.passing_repositories} />
          </p>
        </div>
      </GlassCard>

      {/* Failing */}
      <GlassCard className="flex items-center gap-5" glow="sunset">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunset-50">
          <ShieldAlert className="h-5 w-5 text-sunset" />
        </div>
        <div>
          <p className="text-[11px] text-frost-dark uppercase tracking-[0.12em] font-medium mb-1">Failing</p>
          <p className="text-2xl font-bold text-sunset tabular-nums">
            <AnimatedCounter target={data.failing_repositories} />
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
