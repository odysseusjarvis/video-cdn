import { CheckCircle } from 'lucide-react'
import * as Icons from 'lucide-react'
import Card from '../ui/Card'
import ScrollReveal from '../ui/ScrollReveal'

export default function ServiceCard({ service, index }) {
  const Icon = Icons[service.icon] || Icons.Zap

  return (
    <ScrollReveal delay={index * 0.1}>
      <Card className="p-6 md:p-8 h-full">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="text-text-primary" size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-text-primary font-bold text-xl mb-2">{service.title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">{service.description}</p>
            <ul className="space-y-2">
              {service.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-text-secondary text-sm">
                  <CheckCircle size={14} className="text-metal-dark flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </ScrollReveal>
  )
}
