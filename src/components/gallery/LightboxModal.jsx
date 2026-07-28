import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function LightboxModal({ item, items, onClose, onNavigate }) {
  useEffect(() => {
    if (!item) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navigatePrev()
      if (e.key === 'ArrowRight') navigateNext()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [item])

  if (!item) return null

  const currentIndex = items.findIndex(i => i.id === item.id)

  const navigatePrev = () => {
    const prev = items[(currentIndex - 1 + items.length) % items.length]
    onNavigate(prev)
  }

  const navigateNext = () => {
    const next = items[(currentIndex + 1) % items.length]
    onNavigate(next)
  }

  const Icon = item.icon

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10 bg-transparent border-none cursor-pointer"
          >
            <X size={28} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); navigatePrev() }}
            className="absolute left-4 text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            <ChevronLeft size={36} />
          </button>

          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`relative w-full max-w-3xl aspect-[16/10] rounded-2xl overflow-hidden bg-surface border border-border`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <Icon className="text-zinc-300 mb-4" size={96} />
              <h3 className="text-text-primary text-2xl font-bold">{item.title}</h3>
              <p className="text-text-muted mt-2">{item.category}</p>
            </div>
          </motion.div>

          <button
            onClick={(e) => { e.stopPropagation(); navigateNext() }}
            className="absolute right-4 text-zinc-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            <ChevronRight size={36} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
