import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-gradient-to-r from-accent to-accent-dark text-dark font-semibold shadow-lg shadow-accent-glow',
  secondary: 'bg-glass border border-glass-border-accent text-accent backdrop-blur-xl',
  outline: 'bg-transparent border border-glass-border text-text-primary',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({ variant = 'primary', size = 'md', icon: Icon, href, to, children, className = '', ...props }) {
  const classes = `
    inline-flex items-center justify-center gap-2 rounded-xl font-medium
    transition-colors cursor-pointer
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
        <Link to={to} className={`${classes} no-underline`} {...props}>{content}</Link>
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
