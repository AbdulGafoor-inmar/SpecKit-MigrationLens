'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  className?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  color = 'bg-accent-blue',
  className,
  showPercent = true,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm text-slate-300">{label}</span>}
          {showPercent && (
            <span className="text-sm font-medium text-slate-400">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={clsx('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}
