import { Award, Wrench, ShieldCheck } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import GlassCard from '../ui/GlassCard'
import ScrollReveal from '../ui/ScrollReveal'

const features = [
  {
    icon: Award,
    title: 'Stručnost',
    description: 'Višegodišnje iskustvo u dijagnostici i popravci najkompleksnijih elektronskih sistema na svim markama vozila.',
  },
  {
    icon: Wrench,
    title: 'Profesionalna Oprema',
    description: 'Koristimo najsavremeniju dijagnostičku opremu i alate za preciznu analizu i popravku.',
  },
  {
    icon: ShieldCheck,
    title: 'Garancija Kvaliteta',
    description: 'Na svaku uslugu dajemo garanciju. Vaše zadovoljstvo je naš prioritet i mjerilo uspjeha.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="py-20 md:py-28 bg-dark-2">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <SectionHeading
          label="Zašto Mi"
          title="Zašto E-Drive?"
          subtitle="Razlozi zašto nam klijenti vjeruju i vraćaju se"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.15}>
              <GlassCard accent className="p-8 h-full">
                <div className="w-14 h-14 rounded-2xl bg-accent-subtle flex items-center justify-center mb-6">
                  <item.icon className="text-accent" size={28} />
                </div>
                <h3 className="text-text-primary font-bold text-xl mb-3">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed">{item.description}</p>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
