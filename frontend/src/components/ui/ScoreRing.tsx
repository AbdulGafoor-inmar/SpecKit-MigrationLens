'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34D399'; // emerald
  if (score >= 60) return '#FBBF24'; // amber
  if (score >= 40) return '#FB923C'; // orange
  return '#FB7185'; // rose
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
}: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.strokeDashoffset = String(circumference);
    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 1.5s ease-out';
      circle.style.strokeDashoffset = String(offset);
    });
  }, [circumference, offset]);

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Score</span>
        </div>
      )}
    </div>
  );
}
