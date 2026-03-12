'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, ProgressBar } from '@/components/ui';
import type { ScanProgress as ScanProgressType } from '@/lib/types';

interface ScanProgressPanelProps {
  progress: ScanProgressType | null;
  isScanning: boolean;
}

export function ScanProgressPanel({ progress, isScanning }: ScanProgressPanelProps) {
  if (!isScanning || !progress) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard hover={false} className="border-accent-amber/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Scan in Progress</h3>
            <span className="text-xs text-slate-400">
              {progress.scanned_repos} / {progress.total_repos} repos
            </span>
          </div>
          <ProgressBar
            value={progress.progress}
            color="bg-gradient-to-r from-accent-blue to-accent-purple"
          />
          {progress.current_repo && (
            <p className="mt-2 text-xs text-slate-400">
              Scanning: <span className="text-white font-medium">{progress.current_repo}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">{progress.message}</p>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
