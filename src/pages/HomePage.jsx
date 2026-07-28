import PageTransition from '../components/layout/PageTransition'
import Hero from '../components/home/Hero'
import ServicesPreview from '../components/home/ServicesPreview'
import WhyChooseUs from '../components/home/WhyChooseUs'
import Stats from '../components/home/Stats'
import CTABanner from '../components/home/CTABanner'

export default function HomePage() {
  return (
    <PageTransition>
      <Hero />
      <ServicesPreview />
      <WhyChooseUs />
      <Stats />
      <CTABanner />
    </PageTransition>
  )
}
