'use client';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function GlassCard({ children, className = '', hover = false, padding = true }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={[
        'bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl',
        'border border-white/20 dark:border-gray-700/30',
        'rounded-2xl shadow-lg',
        padding ? 'p-5' : '',
        hover ? 'transition-transform duration-200 hover:scale-[1.02] cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  );
}
