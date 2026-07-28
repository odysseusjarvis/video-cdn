import { Phone } from 'lucide-react'
import Button from '../ui/Button'
import ScrollReveal from '../ui/ScrollReveal'

export default function CTABanner() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <ScrollReveal>
          <div className="relative rounded-3xl overflow-hidden p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent" />
            <div className="absolute inset-0 border border-glass-border-accent rounded-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Imate problem sa autoelektrikom?
              </h2>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
                Kontaktirajte nas i zakazite termin. Rješavamo svaki problem brzo i profesionalno.
              </p>
              <Button to="/kontakt" size="lg" icon={Phone}>
                Kontaktirajte Nas
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
