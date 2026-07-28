import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Cpu, Snowflake, Zap, Wrench, BatteryCharging, ShieldCheck, CircuitBoard, ZoomIn } from 'lucide-react'
import ScrollReveal from '../ui/ScrollReveal'
import LightboxModal from './LightboxModal'

const categories = ['Sve', 'Dijagnostika', 'Chip Tuning', 'Elektro Radovi']

const galleryItems = [
  { id: 1, icon: Monitor, title: 'OBD Dijagnostika', category: 'Dijagnostika', gradient: 'from-zinc-100 to-zinc-200' },
  { id: 2, icon: Cpu, title: 'ECU Remapping', category: 'Chip Tuning', gradient: 'from-zinc-200 to-zinc-100' },
  { id: 3, icon: Zap, title: 'Elektro Instalacija', category: 'Elektro Radovi', gradient: 'from-zinc-100 to-zinc-50' },
  { id: 4, icon: BatteryCharging, title: 'Alternator Remont', category: 'Elektro Radovi', gradient: 'from-zinc-50 to-zinc-200' },
  { id: 5, icon: Snowflake, title: 'Klima Punjenje', category: 'Dijagnostika', gradient: 'from-zinc-200 to-zinc-100' },
  { id: 6, icon: ShieldCheck, title: 'Immobilizer Sistem', category: 'Elektro Radovi', gradient: 'from-zinc-100 to-zinc-200' },
  { id: 7, icon: CircuitBoard, title: 'BSI Modul Popravka', category: 'Dijagnostika', gradient: 'from-zinc-200 to-zinc-50' },
  { id: 8, icon: Wrench, title: 'Starter Zamjena', category: 'Elektro Radovi', gradient: 'from-zinc-50 to-zinc-100' },
  { id: 9, icon: Cpu, title: 'Stage 2 Tuning', category: 'Chip Tuning', gradient: 'from-zinc-100 to-zinc-200' },
]

export default function GalleryGrid() {
  const [activeCategory, setActiveCategory] = useState('Sve')
  const [selectedItem, setSelectedItem] = useState(null)

  const filtered = activeCategory === 'Sve'
    ? galleryItems
    : galleryItems.filter(item => item.category === activeCategory)

  return (
    <div>
      <ScrollReveal>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-none ${
                activeCategory === cat
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollReveal>

      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedItem(item)}
              className="group cursor-pointer"
            >
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient} border border-border`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <item.icon className="text-zinc-300" size={64} />
                </div>
                <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-900/70 to-transparent">
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-zinc-300 text-xs">{item.category}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <LightboxModal
        item={selectedItem}
        items={filtered}
        onClose={() => setSelectedItem(null)}
        onNavigate={setSelectedItem}
      />
    </div>
  )
}
