import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', hover = true, accent = false }) {
  const base = `
    relative rounded-2xl
    bg-glass backdrop-blur-xl
    border border-glass-border
    ${accent ? 'border-l-2 border-l-accent' : ''}
    ${className}
  `

  if (!hover) {
    return <div className={base}>{children}</div>
  }

  return (
    <motion.div
      className={base}
      whileHover={{
        scale: 1.02,
        y: -4,
        borderColor: 'rgba(0, 212, 255, 0.3)',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
