import ScrollReveal from './ScrollReveal'

export default function SectionHeading({ label, title, subtitle, align = 'center' }) {
  const alignment = align === 'center' ? 'text-center' : 'text-left'

  return (
    <ScrollReveal className={`mb-12 md:mb-16 ${alignment}`}>
      {label && (
        <span className="text-accent text-sm font-semibold uppercase tracking-[0.2em] mb-3 block">
          {label}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
      <div className={`mt-6 h-1 w-12 bg-gradient-to-r from-accent to-accent-dark rounded-full ${align === 'center' ? 'mx-auto' : ''}`} />
    </ScrollReveal>
  )
}
