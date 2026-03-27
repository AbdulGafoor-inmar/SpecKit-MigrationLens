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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide border',
        status === 'pass' && 'bg-teal-50 text-teal border-teal-200',
        status === 'fail' && 'bg-sunset-50 text-sunset border-sunset-200',
        status === 'na' && 'bg-surface-tertiary text-frost-dark border-frost',
        className,
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', {
          'bg-teal': status === 'pass',
          'bg-sunset': status === 'fail',
          'bg-frost-dark': status === 'na',
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
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border',
        severity === 'critical' && 'bg-sunset-50 text-sunset-dark border-sunset-200',
        severity === 'high' && 'bg-sunset-50 text-sunset border-sunset-100',
        severity === 'medium' && 'bg-goldenrod-50 text-goldenrod-dark border-goldenrod-100',
        severity === 'low' && 'bg-plum-50 text-plum border-plum-100',
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
