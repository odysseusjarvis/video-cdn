import { Monitor, Cpu, Snowflake, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import GlassCard from '../ui/GlassCard'
import ScrollReveal from '../ui/ScrollReveal'

const highlights = [
  {
    icon: Monitor,
    title: 'Kompjuterska Dijagnostika',
    description: 'Precizno očitavanje svih elektronskih sistema vozila najnovijom opremom.',
  },
  {
    icon: Cpu,
    title: 'Chip Tuning',
    description: 'Profesionalno remapiranje ECU-a za optimalne performanse i potrošnju.',
  },
  {
    icon: Snowflake,
    title: 'Klima Servis',
    description: 'Kompletan servis auto klima sistema — punjenje, popravka, zamjena.',
  },
  {
    icon: Zap,
    title: 'Auto Elektrika',
    description: 'Popravka i ugradnja kompletnih elektro instalacija na svim vozilima.',
  },
]

export default function ServicesPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          label="Šta Radimo"
          title="Naše Usluge"
          subtitle="Stručna rješenja za sve probleme autoelektrike na vašem vozilu"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.1}>
              <GlassCard className="p-6 md:p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center mb-5">
                  <item.icon className="text-accent" size={24} />
                </div>
                <h3 className="text-text-primary font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.description}</p>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.4} className="text-center mt-10">
          <Link
            to="/usluge"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-dark transition-colors no-underline text-sm font-medium"
          >
            Pogledajte sve usluge
            <ArrowRight size={16} />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
