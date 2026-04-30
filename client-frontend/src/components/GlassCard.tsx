import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', hover = false, padding = true, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onClick={onClick}
      className={[
        'bg-white/70 backdrop-blur-xl',
        'border border-white/30',
        'rounded-2xl shadow-md',
        padding ? 'p-5' : '',
        hover ? 'transition-transform duration-200 hover:scale-[1.02] cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  );
}
