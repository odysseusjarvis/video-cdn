import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import AboutPage from './pages/AboutPage'
import GalleryPage from './pages/GalleryPage'
import ContactPage from './pages/ContactPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg-primary">
      <ScrollToTop />
      <Navbar />
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/usluge" element={<ServicesPage />} />
            <Route path="/o-nama" element={<AboutPage />} />
            <Route path="/galerija" element={<GalleryPage />} />
            <Route path="/kontakt" element={<ContactPage />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}
