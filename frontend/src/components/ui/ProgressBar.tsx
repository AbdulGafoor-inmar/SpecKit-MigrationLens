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
  color = 'bg-plum',
  className,
  showPercent = true,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-[13px] text-plum-dark/70 font-medium">{label}</span>}
          {showPercent && (
            <span className="text-[13px] font-semibold text-plum-dark tabular-nums">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className={clsx('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}
