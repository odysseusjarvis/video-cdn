import { useRef, useState, useEffect, useCallback } from 'react'
import { useScroll, useTransform, motion, AnimatePresence } from 'framer-motion'
import { Monitor, Cpu, Snowflake, Cable, Radio, Cog, ShieldCheck, CircuitBoard, MapPin, ChevronDown } from 'lucide-react'
import ServiceDetailPanel from './ServiceDetailPanel'
import { siteConfig } from '../../config/site'

const TOTAL_FRAMES = 60
const LERP_FACTOR = 0.08

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
  { id: 'dijagnostika', label: 'Dijagnostika', x: 35, y: 28, w: 12, h: 14, borderRadius: '35%', rotation: 0 },
  { id: 'chip-tuning', label: 'Chip Tuning', x: 28, y: 40, w: 11, h: 14, borderRadius: '30%', rotation: -3 },
  { id: 'klima', label: 'Klima', x: 55, y: 38, w: 14, h: 16, borderRadius: '40%', rotation: 0 },
  { id: 'instalacije', label: 'Instalacije', x: 45, y: 58, w: 16, h: 10, borderRadius: '45%', rotation: 0 },
  { id: 'senzori', label: 'Senzori', x: 72, y: 72, w: 12, h: 16, borderRadius: '50%', rotation: 0 },
  { id: 'starteri', label: 'Starteri', x: 14, y: 55, w: 12, h: 16, borderRadius: '35%', rotation: 3 },
  { id: 'alarmi', label: 'Alarmi', x: 82, y: 42, w: 11, h: 14, borderRadius: '40%', rotation: 0 },
  { id: 'moduli', label: 'Moduli', x: 62, y: 28, w: 12, h: 14, borderRadius: '35%', rotation: 0 },
]

function useFrameScrubber(scrollProgress) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const currentFrame = useRef(0)
  const targetFrame = useRef(0)
  const rafId = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    let loadedCount = 0
    const images = []

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = `/images/car/frames/frame-${String(i).padStart(2, '0')}.jpg`
      img.onload = () => {
        loadedCount++
        if (loadedCount === TOTAL_FRAMES && !cancelled) {
          frames.current = images
          setLoaded(true)
        }
      }
      img.onerror = () => {
        loadedCount++
        if (loadedCount === TOTAL_FRAMES && !cancelled) {
          frames.current = images
          setLoaded(true)
        }
      }
      images.push(img)
    }

    return () => { cancelled = true }
  }, [])

  const drawFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current
    const img = frames.current[frameIndex]
    if (!canvas || !img || !img.complete || !img.naturalWidth) return

    const ctx = canvas.getContext('2d')
    const cw = canvas.width
    const ch = canvas.height
    if (cw === 0 || ch === 0) return

    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = cw / ch

    let sw, sh, sx, sy
    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight
      sw = sh * canvasRatio
      sx = (img.naturalWidth - sw) / 2
      sy = 0
    } else {
      sw = img.naturalWidth
      sh = sw / canvasRatio
      sx = 0
      sy = (img.naturalHeight - sh) / 2
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }, [])

  useEffect(() => {
    if (!loaded) return

    const animate = () => {
      const diff = targetFrame.current - currentFrame.current
      if (Math.abs(diff) > 0.1) {
        currentFrame.current += diff * LERP_FACTOR
        const frameIdx = Math.round(currentFrame.current)
        const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIdx))
        drawFrame(clamped)
      }
      rafId.current = requestAnimationFrame(animate)
    }

    drawFrame(0)
    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [loaded, drawFrame])

  useEffect(() => {
    const unsubscribe = scrollProgress.on('change', (v) => {
      const frameStart = 0.10
      const frameEnd = 0.65
      let progress = 0
      if (v <= frameStart) progress = 0
      else if (v >= frameEnd) progress = 1
      else progress = (v - frameStart) / (frameEnd - frameStart)
      targetFrame.current = progress * (TOTAL_FRAMES - 1)
    })
    return unsubscribe
  }, [scrollProgress])

  return { canvasRef, loaded }
}

function useCanvasResize(canvasRef, containerRef) {
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [canvasRef, containerRef])
}

export default function HeroCarVideo() {
  const sectionRef = useRef(null)
  const coverRef = useRef(null)
  const [selectedPart, setSelectedPart] = useState(null)
  const [hoveredPart, setHoveredPart] = useState(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const { canvasRef, loaded } = useFrameScrubber(scrollYProgress)
  useCanvasResize(canvasRef, coverRef)

  const titleOpacity = useTransform(scrollYProgress, [0, 0.08, 0.16], [1, 1, 0])
  const titleY = useTransform(scrollYProgress, [0.08, 0.16], [0, -50])
  const badgeOpacity = useTransform(scrollYProgress, [0, 0.06, 0.14], [1, 1, 0])
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0])

  const overlayOpacity = useTransform(scrollYProgress, [0.58, 0.72], [0, 0.4])
  const hotspotsOpacity = useTransform(scrollYProgress, [0.68, 0.82], [0, 1])
  const ctaOpacity = useTransform(scrollYProgress, [0.80, 0.90], [0, 1])
  const ctaY = useTransform(scrollYProgress, [0.80, 0.90], [20, 0])

  const handlePartClick = (serviceId) => {
    const service = siteConfig.services.find(s => s.id === serviceId)
    if (service) setSelectedPart(service)
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Cover-fit container: maintains 16:9 while covering viewport */}
        <div
          ref={coverRef}
          className="absolute"
          style={{
            width: 'max(100%, calc(100vh * 16 / 9))',
            height: 'max(100%, calc(100vw * 9 / 16))',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Fallback static image while frames load */}
          {!loaded && (
            <img
              src="/images/car/car-hero.jpg"
              alt="Automobil - E-Drive servis"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          )}

          {/* Canvas frame scrubber */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
          />

          {/* Dark overlay for hotspot contrast */}
          <motion.div
            style={{ opacity: overlayOpacity }}
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 pointer-events-none"
          />

          {/* Desktop glow hotspots */}
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

        {/* Hero text overlay — positioned relative to viewport */}
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-24 md:pt-32 px-4 pointer-events-none"
        >
          <motion.div style={{ opacity: badgeOpacity }} className="mb-6 md:mb-8">
            <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 shadow-sm">
              <MapPin size={14} className="text-zinc-500" />
              <span className="text-zinc-700 text-sm font-medium">Gradacac, BiH</span>
            </span>
          </motion.div>

          <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white leading-[1.05] mb-4 md:mb-6 text-center drop-shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
            <span className="block">Autoelektrika</span>
            <span className="block">E-Drive</span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto leading-relaxed text-center drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
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
            <ChevronDown size={28} className="text-white/70 drop-shadow-lg" />
          </motion.div>
        </motion.div>

        {/* Mobile service grid overlay */}
        <motion.div
          style={{ opacity: hotspotsOpacity }}
          className="absolute bottom-4 left-4 right-4 z-20 md:hidden"
        >
          <div className="grid grid-cols-2 gap-2">
            {HOTSPOTS.map((spot) => {
              const Icon = SERVICE_ICONS[spot.id]
              return (
                <button
                  key={spot.id}
                  onClick={() => handlePartClick(spot.id)}
                  className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-2.5 text-left cursor-pointer hover:bg-white transition-colors shadow-sm"
                >
                  {Icon && <Icon size={16} className="text-zinc-600 flex-shrink-0" />}
                  <span className="text-xs font-medium text-zinc-900">{spot.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* CTA text */}
        <motion.p
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="absolute bottom-8 left-0 right-0 z-20 text-white/70 text-sm md:text-base text-center px-4 hidden md:block drop-shadow-lg"
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
