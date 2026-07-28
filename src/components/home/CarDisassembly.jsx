import { useRef, useState } from 'react'
import { useScroll, useTransform, motion, AnimatePresence } from 'framer-motion'
import CarSVG from './CarSVG'
import ServiceDetailPanel from './ServiceDetailPanel'
import { siteConfig } from '../../config/site'

const PART_LABELS = [
  { id: 'dijagnostika', x: '28%', y: '18%' },
  { id: 'chip-tuning', x: '22%', y: '12%' },
  { id: 'klima', x: '12%', y: '52%' },
  { id: 'instalacije', x: '18%', y: '82%' },
  { id: 'senzori', x: '72%', y: '28%' },
  { id: 'starteri', x: '75%', y: '72%' },
  { id: 'alarmi', x: '78%', y: '15%' },
  { id: 'moduli', x: '55%', y: '85%' },
]

export default function CarDisassembly() {
  const containerRef = useRef(null)
  const [selectedPart, setSelectedPart] = useState(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Heading fades in at progress 0-0.15
  const headingOpacity = useTransform(scrollYProgress, [0, 0.08, 0.15], [0, 1, 1])
  const headingY = useTransform(scrollYProgress, [0, 0.08], [30, 0])

  // Labels appear at progress 0.65-0.8
  const labelsOpacity = useTransform(scrollYProgress, [0.6, 0.75], [0, 1])

  // CTA prompt at progress 0.8-1.0
  const ctaOpacity = useTransform(scrollYProgress, [0.78, 0.9], [0, 1])
  const ctaY = useTransform(scrollYProgress, [0.78, 0.9], [20, 0])

  const handlePartClick = (service) => {
    setSelectedPart(service)
  }

  return (
    <section ref={containerRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Heading */}
        <motion.h2
          style={{ opacity: headingOpacity, y: headingY }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary text-center mb-8 tracking-tight"
        >
          Svaki dio vozila — nase znanje
        </motion.h2>

        {/* Car SVG with labels container */}
        <div className="relative w-full max-w-[900px]">
          <CarSVG
            progress={scrollYProgress}
            onPartClick={handlePartClick}
            services={siteConfig.services}
          />

          {/* Part labels - appear when exploded */}
          <motion.div
            style={{ opacity: labelsOpacity }}
            className="absolute inset-0 pointer-events-none"
          >
            {PART_LABELS.map((label, index) => {
              const service = siteConfig.services[index]
              if (!service) return null
              return (
                <div
                  key={label.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: label.x, top: label.y }}
                >
                  <span className="text-[10px] md:text-xs font-medium text-text-secondary bg-surface/90 px-2 py-1 rounded-full border border-border whitespace-nowrap shadow-sm">
                    {service.title}
                  </span>
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* CTA prompt */}
        <motion.p
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="text-text-muted text-sm md:text-base mt-6 text-center"
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
