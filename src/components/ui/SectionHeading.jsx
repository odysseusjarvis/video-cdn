import ScrollReveal from './ScrollReveal'

export default function SectionHeading({ label, title, subtitle, align = 'center' }) {
  const alignment = align === 'center' ? 'text-center' : 'text-left'

  return (
    <ScrollReveal className={`mb-12 md:mb-16 ${alignment}`}>
      {label && (
        <span className="text-text-muted text-xs font-medium uppercase tracking-[0.25em] mb-3 block">
          {label}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-text-secondary text-lg max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </ScrollReveal>
  )
}
