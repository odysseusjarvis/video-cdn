import { siteConfig } from '../../config/site'
import AnimatedCounter from '../ui/AnimatedCounter'
import ScrollReveal from '../ui/ScrollReveal'

export default function Stats() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-glass border border-glass-border rounded-3xl p-8 md:p-12 backdrop-blur-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {siteConfig.stats.map((stat) => (
                <AnimatedCounter
                  key={stat.label}
                  target={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
