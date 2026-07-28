import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import ScrollReveal from '../ui/ScrollReveal'

const skills = [
  { name: 'Kompjuterska Dijagnostika', level: 98 },
  { name: 'Chip Tuning / ECU Remapping', level: 95 },
  { name: 'Elektro Instalacije', level: 92 },
  { name: 'Klima Sistemi', level: 90 },
  { name: 'Moduli i Programiranje', level: 88 },
]

function SkillBar({ name, level, delay }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <div ref={ref} className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-text-primary text-sm font-medium">{name}</span>
        <span className="text-accent text-sm font-semibold">{level}%</span>
      </div>
      <div className="h-2 bg-dark-3 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-accent-dark rounded-full"
          initial={{ width: 0 }}
          animate={isInView ? { width: `${level}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  )
}

export default function Expertise() {
  return (
    <section className="py-16">
      <ScrollReveal>
        <div className="max-w-2xl mx-auto">
          <span className="text-accent text-sm font-semibold uppercase tracking-[0.2em] mb-3 block text-center">
            Ekspertiza
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-10 text-center">
            Naša Stručnost
          </h3>
          {skills.map((skill, i) => (
            <SkillBar key={skill.name} {...skill} delay={i * 0.15} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}
