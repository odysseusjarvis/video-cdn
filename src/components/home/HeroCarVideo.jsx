import { useRef, useState, useEffect } from 'react'
import { useScroll, useTransform, motion, AnimatePresence, useMotionValueEvent } from 'framer-motion'
import { Monitor, Cpu, Snowflake, Cable, Radio, Cog, ShieldCheck, CircuitBoard, MapPin, ChevronDown } from 'lucide-react'
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
  { id: 'dijagnostika', x: 38, y: 26, label: 'Dijagnostika' },
  { id: 'chip-tuning', x: 32, y: 50, label: 'Chip Tuning' },
  { id: 'klima', x: 50, y: 48, label: 'Klima' },
  { id: 'instalacije', x: 50, y: 35, label: 'Instalacije' },
  { id: 'senzori', x: 75, y: 72, label: 'Senzori' },
  { id: 'starteri', x: 25, y: 55, label: 'Starteri' },
  { id: 'alarmi', x: 45, y: 22, label: 'Alarmi' },
  { id: 'moduli', x: 62, y: 28, label: 'Moduli' },
]

export default function HeroCarVideo() {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [selectedPart, setSelectedPart] = useState(null)
  const [hoveredPart, setHoveredPart] = useState(null)
  const [hasVideo, setHasVideo] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onLoaded = () => setHasVideo(true)
    const onError = () => setHasVideo(false)
    video.addEventListener('loadeddata', onLoaded)
    video.addEventListener('error', onError)
    return () => {
      video.removeEventListener('loadeddata', onLoaded)
      video.removeEventListener('error', onError)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const titleOpacity = useTransform(scrollYProgress, [0, 0.08, 0.14], [1, 1, 0])
  const titleY = useTransform(scrollYProgress, [0.08, 0.14], [0, -40])
  const badgeOpacity = useTransform(scrollYProgress, [0, 0.06, 0.12], [1, 1, 0])
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0])

  const overlayOpacity = useTransform(scrollYProgress, [0.55, 0.68], [0, 0.35])
  const hotspotsOpacity = useTransform(scrollYProgress, [0.62, 0.75], [0, 1])
  const ctaOpacity = useTransform(scrollYProgress, [0.75, 0.85], [0, 1])
  const ctaY = useTransform(scrollYProgress, [0.75, 0.85], [20, 0])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const video = videoRef.current
    if (!video || !video.duration || !hasVideo) return
    const videoStart = 0.12
    const videoEnd = 0.6
    if (progress < videoStart) {
      video.currentTime = 0
    } else if (progress > videoEnd) {
      video.currentTime = video.duration
    } else {
      const videoProgress = (progress - videoStart) / (videoEnd - videoStart)
      video.currentTime = videoProgress * video.duration
    }
  })

  const handlePartClick = (serviceId) => {
    const service = siteConfig.services.find(s => s.id === serviceId)
    if (service) setSelectedPart(service)
  }

  return (
    <section ref={containerRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Hero text overlay */}
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-24 md:pt-32 px-4"
        >
          <motion.div style={{ opacity: badgeOpacity }} className="mb-6 md:mb-8">
            <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-border rounded-full px-4 py-2">
              <MapPin size={14} className="text-text-muted" />
              <span className="text-text-secondary text-sm font-medium">Gradacac, BiH</span>
            </span>
          </motion.div>

          <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-text-primary leading-[1.05] mb-4 md:mb-6 text-center">
            <span className="block">Autoelektrika</span>
            <span className="block">E-Drive</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed text-center">
            {siteConfig.tagline}
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: scrollHintOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={28} className="text-text-muted" />
          </motion.div>
        </motion.div>

        {/* Car area */}
        <div className="relative w-full max-w-[1000px] px-4 md:px-8 mt-auto mb-8 md:mb-16">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
            {/* Static car image (always visible as base/poster) */}
            <img
              src="/images/car/car-hero.jpg"
              alt="Automobil - E-Drive servis"
              className={`w-full h-auto block ${hasVideo ? 'invisible' : 'visible'}`}
              loading="eager"
            />

            {/* Video overlay (scroll-driven) */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${hasVideo ? 'visible' : 'invisible'}`}
              muted
              playsInline
              preload="auto"
              poster="/images/car/car-hero.jpg"
            >
              <source src="/videos/car-disassembly.mp4" type="video/mp4" />
            </video>

            {/* Dark overlay for hotspot visibility */}
            <motion.div
              style={{ opacity: overlayOpacity }}
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10"
            />

            {/* Hotspot markers */}
            <motion.div
              style={{ opacity: hotspotsOpacity }}
              className="absolute inset-0 hidden md:block"
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
                      <span className="absolute w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 animate-ping" />
                      <span className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/50 transition-transform group-hover:scale-110">
                        {Icon && <Icon size={18} className="text-zinc-800" />}
                      </span>
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
          </div>

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
          className="text-text-muted text-sm md:text-base mb-8 text-center px-4"
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
