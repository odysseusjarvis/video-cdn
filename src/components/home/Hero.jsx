import { motion } from 'framer-motion'
import { ArrowRight, Phone, ChevronDown } from 'lucide-react'
import Button from '../ui/Button'

function FloatingParticle({ delay, x, y, size }) {
  return (
    <motion.div
      className="absolute rounded-full bg-accent/20"
      style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
      animate={{
        y: [0, -30, 0],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

const particles = [
  { delay: 0, x: 10, y: 20, size: 4 },
  { delay: 0.5, x: 85, y: 15, size: 6 },
  { delay: 1, x: 70, y: 60, size: 3 },
  { delay: 1.5, x: 20, y: 70, size: 5 },
  { delay: 2, x: 50, y: 30, size: 4 },
  { delay: 0.8, x: 90, y: 80, size: 3 },
  { delay: 1.2, x: 30, y: 45, size: 5 },
  { delay: 2.5, x: 60, y: 85, size: 4 },
]

const headlineWords = "Autoelektrika E-Drive".split(' ')

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.08)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,212,255,0.05)_0%,_transparent_50%)]" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {particles.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-glass border border-glass-border rounded-full px-4 py-2 mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-text-secondary text-sm">Gradačac, BiH</span>
        </motion.div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className={`inline-block mr-3 md:mr-4 ${
                word === 'E-Drive' ? 'text-accent' : 'text-text-primary'
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Kompletna dijagnostika i popravka autoelektrike.
          Od kompjuterske dijagnostike do chip tuninga — rješavamo svaki problem.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button to="/usluge" size="lg" icon={ArrowRight}>
            Naše Usluge
          </Button>
          <Button to="/kontakt" variant="secondary" size="lg" icon={Phone}>
            Kontaktirajte Nas
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="text-text-muted" size={28} />
        </motion.div>
      </motion.div>
    </section>
  )
}
