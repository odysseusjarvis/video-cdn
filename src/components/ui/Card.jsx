import { motion } from 'framer-motion'

export default function Card({ children, className = '', hover = true, accent = false, onClick }) {
  return (
    <motion.div
      className={`bg-surface rounded-2xl border border-border ${accent ? 'border-l-2 border-l-accent' : ''} shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${onClick ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
