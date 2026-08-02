import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Card from '../ui/Card'
import ScrollReveal from '../ui/ScrollReveal'

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const inputClass = `
    w-full bg-bg-primary border border-border rounded-xl px-4 py-3
    text-text-primary placeholder-text-muted text-sm
    focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
    transition-colors
  `

  return (
    <ScrollReveal>
      <Card hover={false} className="p-6 md:p-8">
        <h3 className="text-text-primary font-bold text-xl mb-6">Pošaljite Poruku</h3>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
              <p className="text-text-primary font-semibold text-lg">Poruka Poslana!</p>
              <p className="text-text-secondary text-sm mt-2">Javit ćemo vam se u najkraćem roku.</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="Ime i Prezime" required className={inputClass} />
                <input type="email" placeholder="Email Adresa" required className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="tel" placeholder="Telefon" className={inputClass} />
                <input type="text" placeholder="Marka i Model Vozila" className={inputClass} />
              </div>
              <textarea
                placeholder="Opišite vaš problem ili upit..."
                rows={5}
                required
                className={`${inputClass} resize-none`}
              />
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-white font-semibold px-8 py-3 rounded-xl cursor-pointer border-none text-sm hover:bg-dark-2 transition-colors"
              >
                <Send size={16} />
                Pošaljite Poruku
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </Card>
    </ScrollReveal>
  )
}
