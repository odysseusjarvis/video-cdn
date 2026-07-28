import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-accent text-white font-semibold shadow-sm hover:bg-dark-2',
  secondary: 'bg-surface border border-border text-text-primary hover:bg-bg-secondary',
  outline: 'bg-transparent border border-metal-light text-text-secondary hover:border-metal-dark hover:text-text-primary',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({ variant = 'primary', size = 'md', icon: Icon, href, to, children, className = '', ...props }) {
  const classes = `
    inline-flex items-center justify-center gap-2 rounded-xl font-medium
    transition-colors cursor-pointer no-underline
    ${variants[variant]} ${sizes[size]} ${className}
  `

  const motionProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 },
  }

  const content = (
    <>
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />}
      {children}
    </>
  )

  if (to) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link to={to} className={classes} {...props}>{content}</Link>
      </motion.div>
    )
  }

  if (href) {
    return (
      <motion.a href={href} className={classes} {...motionProps} {...props}>{content}</motion.a>
    )
  }

  return (
    <motion.button className={classes} {...motionProps} {...props}>{content}</motion.button>
  )
}
