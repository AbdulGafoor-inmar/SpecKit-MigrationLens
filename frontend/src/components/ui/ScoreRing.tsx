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

function getScoreGradient(score: number): [string, string] {
  if (score >= 80) return ['#03878C', '#05A5AB']; // teal
  if (score >= 60) return ['#FFC20E', '#FFD24E']; // goldenrod
  if (score >= 40) return ['#F15A22', '#F47B4D']; // sunset
  return ['#F15A22', '#C44A1B']; // sunset dark
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#03878C';
  if (score >= 60) return '#FFC20E';
  if (score >= 40) return '#F15A22';
  return '#F15A22';
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
  const [color1, color2] = getScoreGradient(score);
  const color = getScoreColor(score);
  const gradientId = `score-grad-${size}-${Math.round(score)}`;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.strokeDashoffset = String(circumference);
    requestAnimationFrame(() => {
      circle.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)';
      circle.style.strokeDashoffset = String(offset);
    });
  }, [circumference, offset]);

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EDEDF6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 6px ${color}30)` }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-plum-dark tabular-nums">{Math.round(score)}</span>
          <span className="text-[9px] text-frost-dark uppercase tracking-[0.15em] font-medium">Score</span>
        </div>
      )}
    </div>
  );
}
