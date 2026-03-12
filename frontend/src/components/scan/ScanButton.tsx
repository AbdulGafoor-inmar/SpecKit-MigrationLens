'use client';

import { ScanLine } from 'lucide-react';
import { clsx } from 'clsx';

interface ScanButtonProps {
  onScan: () => void;
  isScanning: boolean;
  className?: string;
}

export function ScanButton({ onScan, isScanning, className }: ScanButtonProps) {
  return (
    <button
      onClick={onScan}
      disabled={isScanning}
      className={clsx(
        'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold',
        'bg-gradient-to-r from-accent-blue to-accent-purple text-white',
        'hover:shadow-glow transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        className,
      )}
    >
      <ScanLine className={clsx('h-4 w-4', isScanning && 'animate-spin')} />
      {isScanning ? 'Scanning...' : 'Start Scan'}
    </button>
  );
}
