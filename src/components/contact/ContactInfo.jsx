import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import InstagramIcon from '../ui/InstagramIcon'
import { siteConfig } from '../../config/site'
import Card from '../ui/Card'
import ScrollReveal from '../ui/ScrollReveal'

const items = [
  { icon: Phone, label: 'Telefon', value: siteConfig.contact.phone },
  { icon: Mail, label: 'Email', value: siteConfig.contact.email },
  { icon: MapPin, label: 'Adresa', value: siteConfig.contact.address },
]

export default function ContactInfo() {
  return (
    <ScrollReveal delay={0.2}>
      <Card hover={false} className="p-6 md:p-8">
        <h3 className="text-text-primary font-bold text-xl mb-6">Kontakt Informacije</h3>

        <div className="space-y-5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <item.icon className="text-text-primary" size={18} />
              </div>
              <div>
                <p className="text-text-muted text-xs">{item.label}</p>
                <p className="text-text-primary text-sm font-medium">{item.value}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center flex-shrink-0">
              <Clock className="text-text-primary" size={18} />
            </div>
            <div>
              <p className="text-text-muted text-xs">Radno Vrijeme</p>
              <p className="text-text-primary text-sm font-medium">{siteConfig.contact.workingHours.weekdays}</p>
              <p className="text-text-primary text-sm">{siteConfig.contact.workingHours.saturday}</p>
              <p className="text-text-muted text-sm">{siteConfig.contact.workingHours.sunday}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors no-underline"
            >
              <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center">
                <InstagramIcon className="text-text-primary" size={18} />
              </div>
              <div>
                <p className="text-text-muted text-xs">Instagram</p>
                <p className="text-sm font-medium">@edrive.servis</p>
              </div>
            </a>
          </div>
        </div>
      </Card>
    </ScrollReveal>
  )
}
