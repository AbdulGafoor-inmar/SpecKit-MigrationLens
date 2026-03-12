'use client';

import { Activity, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  onRefresh?: () => void;
  isScanning?: boolean;
  className?: string;
}

export function Header({ onRefresh, isScanning, className }: HeaderProps) {
  return (
    <header className={clsx('glass-header sticky top-0 z-40 px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/20">
            <Activity className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">MigrationLens</h1>
            <p className="text-[11px] text-slate-500 tracking-wide">
              .NET 10 / C# 14 Compliance Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isScanning && (
            <div className="flex items-center gap-2 text-xs text-accent-amber">
              <span className="h-2 w-2 rounded-full bg-accent-amber animate-pulse" />
              Scanning...
            </div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isScanning}
              className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                'bg-white/[0.06] border border-white/[0.08] text-slate-300',
                'hover:bg-white/[0.10] hover:text-white transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <RefreshCcw className={clsx('h-4 w-4', isScanning && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
