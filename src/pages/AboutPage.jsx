import PageTransition from '../components/layout/PageTransition'
import SectionHeading from '../components/ui/SectionHeading'
import Story from '../components/about/Story'
import Expertise from '../components/about/Expertise'
import Values from '../components/about/Values'
import CTABanner from '../components/home/CTABanner'

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="pt-24 md:pt-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            label="Ko Smo"
            title="O Nama"
            subtitle="Upoznajte E-Drive tim i našu priču"
          />
          <Story />
          <Expertise />
          <Values />
        </div>
        <CTABanner />
      </div>
    </PageTransition>
  )
}
