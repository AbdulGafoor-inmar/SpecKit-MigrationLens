'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import React from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'blue' | 'emerald' | 'rose' | 'none';
}

const glowMap = {
  blue: 'hover:shadow-glow',
  emerald: 'hover:shadow-glow-emerald',
  rose: 'hover:shadow-glow-rose',
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={clsx(
        'glass-card',
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
