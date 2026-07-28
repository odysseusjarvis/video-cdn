import { Wrench } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'

export default function Story() {
  return (
    <section className="py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <ScrollReveal direction="left">
          <span className="text-accent text-sm font-semibold uppercase tracking-[0.2em] mb-4 block">
            Naša Priča
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-6 leading-tight">
            Strast prema autoelektrici koja traje godinama
          </h3>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>
              Autoelektrika E-Drive je nastala iz čiste ljubavi prema automobilima i elektronici.
              Kroz godine rada stekli smo iskustvo koje nam omogućava da rješavamo i
              najkompleksnije probleme na svim markama i modelima vozila.
            </p>
            <p>
              Naš pristup je temeljit — svako vozilo doslovno rastavljamo do posljednje žice
              ako je potrebno, kako bismo pronašli i otklonili kvar. Nema prečica,
              nema kompromisa, samo kvalitetna dijagnostika i trajno rješenje.
            </p>
            <p>
              Sa sjedištem u Gradačcu, pružamo usluge klijentima iz cijele regije.
              Naša misija je jednostavna: riješiti vaš problem brzo, profesionalno
              i po fer cijeni.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="right">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-dark-3 border border-glass-border">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Wrench className="text-accent/30 mx-auto mb-4" size={80} />
                <p className="text-text-muted text-sm">Autoelektrika E-Drive</p>
                <p className="text-text-muted text-xs mt-1">Gradačac, BiH</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
