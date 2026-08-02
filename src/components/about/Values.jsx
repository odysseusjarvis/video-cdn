import { Gem, Heart, Lightbulb } from 'lucide-react'
import Card from '../ui/Card'
import ScrollReveal from '../ui/ScrollReveal'

const values = [
  {
    icon: Gem,
    title: 'Kvalitet',
    description: 'Svaki posao radimo kao da je za naše vlastito vozilo. Bez kompromisa, bez prečica.',
  },
  {
    icon: Heart,
    title: 'Povjerenje',
    description: 'Gradimo dugoročne odnose sa klijentima. Transparentnost i iskrenost su temelj našeg poslovanja.',
  },
  {
    icon: Lightbulb,
    title: 'Inovacija',
    description: 'Pratimo najnovije tehnologije i kontinuirano unaprjeđujemo naše znanje i opremu.',
  },
]

export default function Values() {
  return (
    <section className="py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {values.map((value, i) => (
          <ScrollReveal key={value.title} delay={i * 0.15}>
            <Card className="p-8 text-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-bg-secondary flex items-center justify-center mx-auto mb-6">
                <value.icon className="text-text-primary" size={32} />
              </div>
              <h3 className="text-text-primary font-bold text-xl mb-3">{value.title}</h3>
              <p className="text-text-secondary leading-relaxed">{value.description}</p>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
