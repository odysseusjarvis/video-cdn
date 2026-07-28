import { siteConfig } from '../../config/site'
import ServiceCard from './ServiceCard'

export default function ServicesList() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      {siteConfig.services.map((service, i) => (
        <ServiceCard key={service.id} service={service} index={i} />
      ))}
    </div>
  )
}
