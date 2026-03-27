'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, ProgressBar } from '@/components/ui';
import type { ScanProgress as ScanProgressType } from '@/lib/types';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface ScanProgressPanelProps {
  progress: ScanProgressType | null;
  isScanning: boolean;
}

export function ScanProgressPanel({ progress, isScanning }: ScanProgressPanelProps) {
  if (!progress) return null;

  const pct = progress.progress ?? 0;
  const completed = !isScanning && pct >= 100;
  const idle = !isScanning && pct < 100;

  return (
    <GlassCard hover={false} className={isScanning ? 'border-goldenrod/20' : completed ? 'border-teal/20' : 'border-frost'}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isScanning ? (
            <Loader2 className="h-4 w-4 text-plum animate-spin" />
          ) : completed ? (
            <CheckCircle2 className="h-4 w-4 text-teal" />
          ) : (
            <Clock className="h-4 w-4 text-frost-dark" />
          )}
          <h3 className="text-sm font-semibold text-plum-dark">
            {isScanning ? 'Scan in Progress' : completed ? 'Scan Complete' : 'Scan Status'}
          </h3>
        </div>
        <span className="text-xs text-frost-dark">
          {progress.scanned_repos} / {progress.total_repos} repos
        </span>
      </div>
      <ProgressBar
        value={pct}
        color={
          isScanning
            ? 'bg-gradient-to-r from-plum to-teal'
            : completed
              ? 'bg-teal'
              : 'bg-frost'
        }
      />
      {progress.current_repo && isScanning && (
        <p className="mt-2 text-xs text-frost-dark">
          Scanning: <span className="text-plum-dark font-medium">{progress.current_repo}</span>
        </p>
      )}
      <p className="mt-1 text-xs text-frost-dark">{progress.message || (idle ? 'Ready to scan' : '')}</p>
    </GlassCard>
  );
}
