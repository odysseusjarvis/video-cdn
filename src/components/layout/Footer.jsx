import { Link } from 'react-router-dom'
import { Zap, MapPin, Phone, Mail } from 'lucide-react'
import InstagramIcon from '../ui/InstagramIcon'
import { siteConfig } from '../../config/site'

export default function Footer() {
  return (
    <footer className="bg-dark border-t border-zinc-800">

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div>
            <Link to="/" className="flex items-center gap-2 no-underline mb-4">
              <Zap className="text-zinc-400" size={24} />
              <span className="text-xl font-bold text-white">
                E-<span className="text-zinc-400">Drive</span>
              </span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
              {siteConfig.description}
            </p>
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-zinc-400 hover:text-white transition-colors no-underline text-sm"
            >
              <InstagramIcon size={18} />
              @edrive.servis
            </a>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Brzi Linkovi</h3>
            <ul className="space-y-2 list-none p-0 m-0">
              {siteConfig.nav.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-zinc-400 hover:text-white transition-colors no-underline text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Kontakt</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              <li className="flex items-center gap-3 text-zinc-400 text-sm">
                <Phone size={16} className="text-zinc-500 flex-shrink-0" />
                {siteConfig.contact.phone}
              </li>
              <li className="flex items-center gap-3 text-zinc-400 text-sm">
                <Mail size={16} className="text-zinc-500 flex-shrink-0" />
                {siteConfig.contact.email}
              </li>
              <li className="flex items-center gap-3 text-zinc-400 text-sm">
                <MapPin size={16} className="text-zinc-500 flex-shrink-0" />
                {siteConfig.contact.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Sva prava zadržana.
          </p>
        </div>
      </div>
    </footer>
  )
}
