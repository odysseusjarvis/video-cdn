import { useRef, useState } from 'react'
import { useScroll, useTransform, motion, AnimatePresence } from 'framer-motion'
import { Monitor, Cpu, Snowflake, Cable, Radio, Cog, ShieldCheck, CircuitBoard } from 'lucide-react'
import ServiceDetailPanel from './ServiceDetailPanel'
import { siteConfig } from '../../config/site'

const SERVICE_ICONS = {
  dijagnostika: Monitor,
  'chip-tuning': Cpu,
  klima: Snowflake,
  instalacije: Cable,
  senzori: Radio,
  starteri: Cog,
  alarmi: ShieldCheck,
  moduli: CircuitBoard,
}

const HOTSPOTS = [
  { id: 'dijagnostika', x: 38, y: 32, label: 'Dijagnostika' },
  { id: 'chip-tuning', x: 30, y: 22, label: 'Chip Tuning' },
  { id: 'klima', x: 52, y: 48, label: 'Klima' },
  { id: 'instalacije', x: 62, y: 70, label: 'Instalacije' },
  { id: 'senzori', x: 22, y: 55, label: 'Senzori' },
  { id: 'starteri', x: 72, y: 42, label: 'Starteri' },
  { id: 'alarmi', x: 45, y: 18, label: 'Alarmi' },
  { id: 'moduli', x: 55, y: 28, label: 'Moduli' },
]

export default function CarDisassembly() {
  const containerRef = useRef(null)
  const [selectedPart, setSelectedPart] = useState(null)
  const [hoveredPart, setHoveredPart] = useState(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const headingOpacity = useTransform(scrollYProgress, [0, 0.06, 0.15], [0, 1, 1])
  const headingY = useTransform(scrollYProgress, [0, 0.06], [40, 0])
  const carScale = useTransform(scrollYProgress, [0.05, 0.2], [0.92, 1])
  const carOpacity = useTransform(scrollYProgress, [0.05, 0.15], [0, 1])
  const overlayOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 0.35])
  const hotspotsOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1])
  const ctaOpacity = useTransform(scrollYProgress, [0.6, 0.75], [0, 1])
  const ctaY = useTransform(scrollYProgress, [0.6, 0.75], [20, 0])

  const handlePartClick = (serviceId) => {
    const service = siteConfig.services.find(s => s.id === serviceId)
    if (service) setSelectedPart(service)
  }

  return (
    <section ref={containerRef} className="relative" style={{ height: '400vh' }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Heading */}
        <motion.h2
          style={{ opacity: headingOpacity, y: headingY }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary text-center mb-6 md:mb-10 tracking-tight px-4 z-10"
        >
          Svaki dio vozila — nase znanje
        </motion.h2>

        {/* Car photo with hotspots */}
        <div className="relative w-full max-w-[1000px] px-4 md:px-8">
          <motion.div
            style={{ scale: carScale, opacity: carOpacity }}
            className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Car image */}
            <img
              src="/images/car/silver-sedan.jpg"
              alt="Automobil - E-Drive servis"
              className="w-full h-auto block"
              loading="eager"
            />

            {/* Dark overlay for hotspot visibility */}
            <motion.div
              style={{ opacity: overlayOpacity }}
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"
            />

            {/* Hotspot markers */}
            <motion.div
              style={{ opacity: hotspotsOpacity }}
              className="absolute inset-0"
            >
              {HOTSPOTS.map((spot, index) => {
                const Icon = SERVICE_ICONS[spot.id]
                const isHovered = hoveredPart === spot.id
                return (
                  <div
                    key={spot.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 * index, type: 'spring', stiffness: 300 }}
                      onClick={() => handlePartClick(spot.id)}
                      onMouseEnter={() => setHoveredPart(spot.id)}
                      onMouseLeave={() => setHoveredPart(null)}
                      className="group relative flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
                      aria-label={spot.label}
                    >
                      {/* Pulse ring */}
                      <span className="absolute w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 animate-ping" />

                      {/* Dot */}
                      <span className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/50 transition-transform group-hover:scale-110">
                        {Icon && <Icon size={18} className="text-zinc-800" />}
                      </span>

                      {/* Label tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.span
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.9 }}
                            transition={{ duration: 0.15 }}
                            className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg"
                          >
                            {spot.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                )
              })}
            </motion.div>
          </motion.div>

          {/* Mobile: service labels grid below the car */}
          <motion.div
            style={{ opacity: hotspotsOpacity }}
            className="grid grid-cols-2 gap-2 mt-4 md:hidden"
          >
            {HOTSPOTS.map((spot) => {
              const Icon = SERVICE_ICONS[spot.id]
              return (
                <button
                  key={spot.id}
                  onClick={() => handlePartClick(spot.id)}
                  className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2.5 text-left cursor-pointer hover:bg-bg-secondary transition-colors"
                >
                  {Icon && <Icon size={16} className="text-text-secondary flex-shrink-0" />}
                  <span className="text-xs font-medium text-text-primary">{spot.label}</span>
                </button>
              )
            })}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.p
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="text-text-muted text-sm md:text-base mt-6 text-center px-4"
        >
          Kliknite na dio za detalje
        </motion.p>
      </div>

      {/* Service Detail Panel */}
      <AnimatePresence>
        {selectedPart && (
          <ServiceDetailPanel
            service={selectedPart}
            onClose={() => setSelectedPart(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
