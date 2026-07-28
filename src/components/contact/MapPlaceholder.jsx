import { MapPin } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ScrollReveal from '../ui/ScrollReveal'

export default function MapPlaceholder() {
  return (
    <ScrollReveal delay={0.3}>
      <GlassCard hover={false} className="p-0 overflow-hidden mt-6">
        <div className="relative aspect-[16/9] bg-dark-3">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <MapPin className="text-accent" size={32} />
            </div>
            <p className="text-text-primary font-semibold">Gradačac, BiH</p>
            <p className="text-text-muted text-sm mt-1">76250</p>
          </div>
        </div>
      </GlassCard>
    </ScrollReveal>
  )
}
