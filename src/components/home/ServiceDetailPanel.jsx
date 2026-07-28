import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, ArrowRight, Volume2, Pause } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'

export default function ServiceDetailPanel({ service, onClose }) {
  if (!service) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel - desktop: right side, mobile: bottom sheet */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-surface z-50 shadow-[-8px_0_30px_rgba(0,0,0,0.1)] overflow-y-auto hidden md:block"
      >
        <PanelContent service={service} onClose={onClose} />
      </motion.div>

      {/* Mobile bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 h-[75vh] bg-surface z-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] overflow-y-auto md:hidden"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-metal-light" />
        </div>
        <PanelContent service={service} onClose={onClose} />
      </motion.div>
    </>
  )
}

function PanelContent({ service, onClose }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="p-6 md:p-8">
      <audio
        ref={audioRef}
        src={`/audio/${service.id}.mp3`}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer border-none"
        aria-label="Zatvori"
      >
        <X size={20} className="text-text-secondary" />
      </button>

      {/* Category badge */}
      <div className="mb-4 mt-2">
        <span className="inline-block text-xs font-medium tracking-wider uppercase text-text-muted bg-bg-secondary px-3 py-1 rounded-full">
          {service.category}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4 pr-10">
        {service.title}
      </h2>

      {/* Description */}
      <p className="text-text-secondary leading-relaxed mb-4">
        {service.description}
      </p>

      {/* Audio play button */}
      <button
        onClick={toggleAudio}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-8 cursor-pointer bg-transparent border-none p-0"
      >
        {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
        {isPlaying ? 'Pauziraj' : 'Poslušaj opis'}
      </button>

      {/* Features */}
      <Card hover={false} className="p-6 mb-8">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Sta nudimo
        </h3>
        <ul className="space-y-3">
          {service.features.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={12} className="text-text-primary" />
              </div>
              <span className="text-text-primary text-sm leading-relaxed">
                {feature}
              </span>
            </motion.li>
          ))}
        </ul>
      </Card>

      {/* CTA */}
      <Button to="/kontakt" size="lg" icon={ArrowRight} className="w-full">
        Zakazi termin
      </Button>

      {/* Contact hint */}
      <p className="text-center text-text-muted text-xs mt-4">
        Besplatna procjena i savjetovanje
      </p>
    </div>
  )
}
