import { motion } from 'framer-motion'
import { MapPin, ChevronDown } from 'lucide-react'
import { siteConfig } from '../../config/site'

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export default function HeroMinimal() {
  return (
    <section className="relative h-screen flex items-center justify-center bg-bg-primary overflow-hidden">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="text-center px-4"
      >
        {/* Location badge */}
        <motion.div variants={fadeUp} className="mb-8">
          <span className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-full px-4 py-2">
            <MapPin size={14} className="text-text-muted" />
            <span className="text-text-secondary text-sm font-medium">
              Gradacac, BiH
            </span>
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          variants={fadeUp}
          className="text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-text-primary leading-[1.05] mb-6"
        >
          <span className="block">Autoelektrika</span>
          <span className="block">E-Drive</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="text-xl text-text-secondary max-w-xl mx-auto leading-relaxed"
        >
          {siteConfig.tagline}
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={28} className="text-text-muted" />
        </motion.div>
      </motion.div>
    </section>
  )
}
