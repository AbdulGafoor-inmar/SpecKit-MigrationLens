'use client';

import { clsx } from 'clsx';
import type { ComplianceStatus, Severity } from '@/lib/types';
import { SEVERITY_MAP, STATUS_MAP } from '@/lib/types';

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        cfg.bg,
        cfg.color,
        className,
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', {
          'bg-emerald-400': status === 'pass',
          'bg-rose-400': status === 'fail',
          'bg-slate-400': status === 'na',
        })}
      />
      {cfg.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const cfg = SEVERITY_MAP[severity];
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        cfg.bg,
        cfg.color,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
