import PageTransition from '../components/layout/PageTransition'
import HeroCarVideo from '../components/home/HeroCarVideo'
import WhyChooseUs from '../components/home/WhyChooseUs'
import Stats from '../components/home/Stats'
import CTABanner from '../components/home/CTABanner'

export default function HomePage() {
  return (
    <PageTransition>
      <HeroCarVideo />
      <WhyChooseUs />
      <Stats />
      <CTABanner />
    </PageTransition>
  )
}
