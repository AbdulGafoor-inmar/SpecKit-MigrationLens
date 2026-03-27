'use client';

import { Activity, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  onRefresh?: () => void;
  isScanning?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Header({ onRefresh, isScanning, className, title, subtitle }: HeaderProps) {
  return (
    <header className={clsx('brand-header sticky top-0 z-40 px-6 py-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-plum to-teal">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold gradient-text leading-tight">{title || 'MigrationLens'}</h1>
            <p className="text-[10px] text-frost-dark tracking-wider font-medium">
              {subtitle || '.NET 10 \u00B7 C# 14 Compliance'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isScanning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sunset-50 border border-sunset-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-sunset animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-sunset" />
              </span>
              <span className="text-xs text-sunset font-medium">Scanning...</span>
            </div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isScanning}
              className={clsx(
                'group btn-ghost',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <RefreshCcw className={clsx(
                'h-3.5 w-3.5 transition-transform duration-500',
                isScanning ? 'animate-spin' : 'group-hover:rotate-180',
              )} />
              <span className="text-xs">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
