'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import React from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'blue' | 'emerald' | 'rose' | 'teal' | 'sunset' | 'purple' | 'amber' | 'none';
}

const glowMap = {
  blue: 'hover:shadow-glow',
  emerald: 'hover:shadow-glow-teal',
  teal: 'hover:shadow-glow-teal',
  rose: 'hover:shadow-glow-sunset',
  sunset: 'hover:shadow-glow-sunset',
  purple: 'hover:shadow-glow',
  amber: 'hover:shadow-glow',
  none: '',
};

export function GlassCard({
  children,
  className,
  hover = true,
  glow = 'blue',
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'brand-card',
        hover && 'cursor-default',
        hover && glowMap[glow],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
