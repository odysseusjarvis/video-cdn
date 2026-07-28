import PageTransition from '../components/layout/PageTransition'
import SectionHeading from '../components/ui/SectionHeading'
import GalleryGrid from '../components/gallery/GalleryGrid'

export default function GalleryPage() {
  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <SectionHeading
            label="Naši Radovi"
            title="Galerija"
            subtitle="Pogledajte primjere naših radova i usluga"
          />
          <GalleryGrid />
        </div>
      </div>
    </PageTransition>
  )
}
