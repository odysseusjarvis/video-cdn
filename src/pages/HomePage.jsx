import PageTransition from '../components/layout/PageTransition'
import HeroMinimal from '../components/home/HeroMinimal'
import CarDisassembly from '../components/home/CarDisassembly'
import WhyChooseUs from '../components/home/WhyChooseUs'
import Stats from '../components/home/Stats'
import CTABanner from '../components/home/CTABanner'

export default function HomePage() {
  return (
    <PageTransition>
      <HeroMinimal />
      <CarDisassembly />
      <WhyChooseUs />
      <Stats />
      <CTABanner />
    </PageTransition>
  )
}
