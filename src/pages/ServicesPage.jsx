import PageTransition from '../components/layout/PageTransition'
import SectionHeading from '../components/ui/SectionHeading'
import ServicesList from '../components/services/ServicesList'
import CTABanner from '../components/home/CTABanner'

export default function ServicesPage() {
  return (
    <PageTransition>
      <div className="pt-24 md:pt-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            label="Šta Nudimo"
            title="Naše Usluge"
            subtitle="Kompletna ponuda autoelektrike — od dijagnostike do popravke najkompleksnijih sistema"
          />
          <ServicesList />
        </div>
        <CTABanner />
      </div>
    </PageTransition>
  )
}
