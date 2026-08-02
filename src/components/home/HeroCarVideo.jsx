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
  { id: 'dijagnostika', label: 'Dijagnostika', x: 38, y: 26, w: 14, h: 10, borderRadius: '40%', rotation: 0 },
  { id: 'chip-tuning', label: 'Chip Tuning', x: 32, y: 50, w: 10, h: 8, borderRadius: '30%', rotation: -5 },
  { id: 'klima', label: 'Klima', x: 18, y: 63, w: 12, h: 9, borderRadius: '35%', rotation: 0 },
  { id: 'instalacije', label: 'Instalacije', x: 50, y: 35, w: 16, h: 7, borderRadius: '45%', rotation: 0 },
  { id: 'senzori', label: 'Senzori', x: 75, y: 72, w: 10, h: 8, borderRadius: '50%', rotation: 0 },
  { id: 'starteri', label: 'Starteri', x: 25, y: 55, w: 11, h: 9, borderRadius: '35%', rotation: 5 },
  { id: 'alarmi', label: 'Alarmi', x: 45, y: 52, w: 12, h: 8, borderRadius: '40%', rotation: 0 },
  { id: 'moduli', label: 'Moduli', x: 62, y: 28, w: 11, h: 9, borderRadius: '35%', rotation: 0 },
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
          <div className="relative">
            <div className="overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
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
            </div>

            {/* Glow hotspot layer — outside overflow-hidden so glow isn't clipped */}
            <motion.div
              style={{ opacity: hotspotsOpacity }}
              className="absolute inset-0 hidden md:block pointer-events-none"
            >
              {HOTSPOTS.map((spot, index) => {
                const isHovered = hoveredPart === spot.id
                return (
                  <motion.button
                    key={spot.id}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      boxShadow: [
                        '0 0 20px 8px rgba(59,130,246,0.10), inset 0 0 15px 5px rgba(59,130,246,0.06)',
                        '0 0 30px 12px rgba(59,130,246,0.18), inset 0 0 20px 8px rgba(59,130,246,0.10)',
                        '0 0 20px 8px rgba(59,130,246,0.10), inset 0 0 15px 5px rgba(59,130,246,0.06)',
                      ],
                    }}
                    whileHover={{
                      boxShadow: '0 0 40px 16px rgba(59,130,246,0.30), inset 0 0 25px 10px rgba(59,130,246,0.15)',
                    }}
                    transition={{
                      opacity: { delay: 0.08 * index, duration: 0.4 },
                      boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 * index },
                    }}
                    onClick={() => handlePartClick(spot.id)}
                    onMouseEnter={() => setHoveredPart(spot.id)}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="absolute cursor-pointer border-none p-0 pointer-events-auto"
                    style={{
                      left: `${spot.x - spot.w / 2}%`,
                      top: `${spot.y - spot.h / 2}%`,
                      width: `${spot.w}%`,
                      height: `${spot.h}%`,
                      borderRadius: spot.borderRadius || '40%',
                      transform: `rotate(${spot.rotation || 0}deg)`,
                      background: isHovered
                        ? 'radial-gradient(ellipse at center, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.08) 60%, transparent 100%)'
                        : 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 60%, transparent 100%)',
                    }}
                    aria-label={spot.label}
                  >
                    <AnimatePresence>
                      {isHovered && (
                        <motion.span
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 backdrop-blur-sm text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10"
                          style={{ top: '100%', marginTop: '8px' }}
                        >
                          {spot.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
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
