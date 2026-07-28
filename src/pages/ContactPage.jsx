import PageTransition from '../components/layout/PageTransition'
import SectionHeading from '../components/ui/SectionHeading'
import ContactForm from '../components/contact/ContactForm'
import ContactInfo from '../components/contact/ContactInfo'
import MapPlaceholder from '../components/contact/MapPlaceholder'

export default function ContactPage() {
  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            label="Javite Nam Se"
            title="Kontakt"
            subtitle="Imate pitanje ili želite zakazati termin? Kontaktirajte nas!"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ContactForm />
            <div>
              <ContactInfo />
              <MapPlaceholder />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
