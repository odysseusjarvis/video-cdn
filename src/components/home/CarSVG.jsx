import { motion, useTransform } from 'framer-motion'

const PART_CONFIG = [
  { id: 'part-ecu-display', serviceIndex: 0, explodeX: -180, explodeY: -140 },
  { id: 'part-ecu-chip', serviceIndex: 1, explodeX: -60, explodeY: -180 },
  { id: 'part-ac-compressor', serviceIndex: 2, explodeX: -220, explodeY: 20 },
  { id: 'part-wiring', serviceIndex: 3, explodeX: -160, explodeY: 140 },
  { id: 'part-sensors', serviceIndex: 4, explodeX: 200, explodeY: -80 },
  { id: 'part-starter-alternator', serviceIndex: 5, explodeX: 180, explodeY: 100 },
  { id: 'part-alarm-module', serviceIndex: 6, explodeX: 200, explodeY: -140 },
  { id: 'part-electronic-module', serviceIndex: 7, explodeX: 40, explodeY: 180 },
]

function PartGroup({ id, progress, explodeX, explodeY, staggerIndex, onClick, children }) {
  const staggerStart = 0.15 + staggerIndex * 0.06
  const staggerEnd = Math.min(staggerStart + 0.2, 0.65)

  const x = useTransform(progress, [0, staggerStart, staggerEnd, 1], [0, 0, explodeX, explodeX])
  const y = useTransform(progress, [0, staggerStart, staggerEnd, 1], [0, 0, explodeY, explodeY])
  const opacity = useTransform(progress, [0, 0.1, staggerEnd], [0.85, 0.85, 1])

  return (
    <motion.g
      id={id}
      style={{ x, y, opacity }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      {children}
    </motion.g>
  )
}

export default function CarSVG({ progress, onPartClick, services }) {
  const bodyOpacity = useTransform(progress, [0, 0.15, 0.55], [1, 1, 0.15])

  const handlePartClick = (serviceIndex) => {
    if (onPartClick && services && services[serviceIndex]) {
      onPartClick(services[serviceIndex])
    }
  }

  return (
    <svg
      viewBox="0 0 1200 600"
      className="w-full h-auto max-w-[900px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main body gradient */}
        <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4D4D8" />
          <stop offset="50%" stopColor="#A1A1AA" />
          <stop offset="100%" stopColor="#71717A" />
        </linearGradient>
        {/* Window gradient */}
        <linearGradient id="window-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#52525B" />
          <stop offset="100%" stopColor="#3F3F46" />
        </linearGradient>
        {/* Wheel gradient */}
        <radialGradient id="wheel-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#71717A" />
          <stop offset="60%" stopColor="#3F3F46" />
          <stop offset="100%" stopColor="#27272A" />
        </radialGradient>
        {/* Part gradients - each subtly different */}
        <linearGradient id="part-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="part-indigo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="part-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="part-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="part-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="part-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="part-violet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="part-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        {/* Subtle body highlight */}
        <linearGradient id="body-highlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Car Body Group */}
      <motion.g id="car-body" style={{ opacity: bodyOpacity }}>
        {/* Underbody shadow */}
        <ellipse cx="600" cy="445" rx="340" ry="18" fill="#1D1D1F" opacity="0.1" />

        {/* Main body shell */}
        <path
          d="M220 340 L220 380 Q220 410 240 420 L340 430 L860 430 Q890 430 900 410 L920 380 L920 340
             L900 300 L840 240 Q820 220 790 210 L720 195
             L580 175 Q560 172 540 175 L440 190
             Q400 196 380 210 L330 240 L280 280 L240 310 Z"
          fill="url(#body-grad)"
          stroke="#71717A"
          strokeWidth="1.5"
        />

        {/* Body highlight line */}
        <path
          d="M260 320 Q400 305 600 300 Q800 305 900 320"
          fill="none"
          stroke="url(#body-highlight)"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Roof line */}
        <path
          d="M400 210 Q420 185 460 175 L580 168 Q620 166 660 170 L740 185 Q760 190 770 200 L790 215"
          fill="none"
          stroke="#71717A"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Front windshield */}
        <path
          d="M400 210 L380 260 Q378 268 385 270 L460 272 L460 178 Q440 182 420 190 Z"
          fill="url(#window-grad)"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.85"
        />

        {/* Side windows */}
        <path
          d="M465 178 L465 272 L620 272 L620 170 Q580 168 540 170 Z"
          fill="url(#window-grad)"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.85"
        />
        <path
          d="M625 170 L625 272 L750 272 L770 210 Q760 195 740 188 L660 174 Z"
          fill="url(#window-grad)"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.85"
        />

        {/* Window pillar dividers */}
        <line x1="462" y1="178" x2="462" y2="272" stroke="#A1A1AA" strokeWidth="4" />
        <line x1="622" y1="170" x2="622" y2="272" stroke="#A1A1AA" strokeWidth="4" />

        {/* Hood */}
        <path
          d="M280 280 L240 310 L220 340 L220 350 L340 340 L380 290 L380 260 Z"
          fill="url(#body-grad)"
          stroke="#71717A"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Hood line */}
        <path d="M340 280 L260 330" fill="none" stroke="#A1A1AA" strokeWidth="1" opacity="0.5" />

        {/* Trunk */}
        <path
          d="M790 215 L840 240 L900 300 L920 340 L920 350 L820 340 L790 280 Z"
          fill="url(#body-grad)"
          stroke="#71717A"
          strokeWidth="1.5"
          opacity="0.9"
        />

        {/* Headlight */}
        <path
          d="M230 330 Q225 320 235 312 L265 300 Q275 296 280 305 L270 335 Q260 342 245 340 Z"
          fill="#E4E4E7"
          stroke="#A1A1AA"
          strokeWidth="1"
        />
        <circle cx="255" cy="318" r="6" fill="#FAFAFA" opacity="0.8" />

        {/* Taillight */}
        <path
          d="M905 320 Q918 318 920 330 L918 350 Q916 360 905 358 L895 345 L898 322 Z"
          fill="#FCA5A5"
          stroke="#A1A1AA"
          strokeWidth="1"
          opacity="0.7"
        />

        {/* Front bumper */}
        <path
          d="M218 350 Q215 370 220 385 Q222 395 235 400 L280 410 L340 418 L340 400 L260 390 Q245 388 240 380 L240 355 Z"
          fill="#A1A1AA"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Rear bumper */}
        <path
          d="M920 350 Q925 370 920 385 Q918 395 905 400 L860 410 L820 418 L820 400 L880 390 Q895 388 900 380 L900 355 Z"
          fill="#A1A1AA"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Door line */}
        <line x1="540" y1="272" x2="530" y2="415" stroke="#A1A1AA" strokeWidth="1" opacity="0.5" />

        {/* Door handle */}
        <rect x="555" y="310" width="30" height="6" rx="3" fill="#D4D4D8" stroke="#A1A1AA" strokeWidth="0.5" />

        {/* Side skirt line */}
        <path
          d="M340 425 Q500 432 700 432 Q820 430 860 425"
          fill="none"
          stroke="#71717A"
          strokeWidth="1"
          opacity="0.4"
        />

        {/* Front wheel */}
        <circle cx="350" cy="420" r="52" fill="url(#wheel-grad)" stroke="#3F3F46" strokeWidth="2" />
        <circle cx="350" cy="420" r="38" fill="#52525B" stroke="#71717A" strokeWidth="1" />
        <circle cx="350" cy="420" r="18" fill="#A1A1AA" stroke="#71717A" strokeWidth="1" />
        <circle cx="350" cy="420" r="6" fill="#D4D4D8" />
        {/* Wheel spokes */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <line
            key={angle}
            x1={350 + 18 * Math.cos((angle * Math.PI) / 180)}
            y1={420 + 18 * Math.sin((angle * Math.PI) / 180)}
            x2={350 + 36 * Math.cos((angle * Math.PI) / 180)}
            y2={420 + 36 * Math.sin((angle * Math.PI) / 180)}
            stroke="#A1A1AA"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}

        {/* Rear wheel */}
        <circle cx="800" cy="420" r="52" fill="url(#wheel-grad)" stroke="#3F3F46" strokeWidth="2" />
        <circle cx="800" cy="420" r="38" fill="#52525B" stroke="#71717A" strokeWidth="1" />
        <circle cx="800" cy="420" r="18" fill="#A1A1AA" stroke="#71717A" strokeWidth="1" />
        <circle cx="800" cy="420" r="6" fill="#D4D4D8" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <line
            key={`r-${angle}`}
            x1={800 + 18 * Math.cos((angle * Math.PI) / 180)}
            y1={420 + 18 * Math.sin((angle * Math.PI) / 180)}
            x2={800 + 36 * Math.cos((angle * Math.PI) / 180)}
            y2={420 + 36 * Math.sin((angle * Math.PI) / 180)}
            stroke="#A1A1AA"
            strokeWidth="3"
            strokeLinecap="round"
          />
        ))}

        {/* Wheel arches */}
        <path
          d="M290 420 Q290 365 350 365 Q410 365 410 420"
          fill="none"
          stroke="#71717A"
          strokeWidth="2"
        />
        <path
          d="M740 420 Q740 365 800 365 Q860 365 860 420"
          fill="none"
          stroke="#71717A"
          strokeWidth="2"
        />

        {/* Side mirror */}
        <ellipse cx="390" cy="260" rx="10" ry="14" fill="#A1A1AA" stroke="#71717A" strokeWidth="1" />
      </motion.g>

      {/* Part 0: ECU Display - Dashboard diagnostic screen */}
      <PartGroup
        id={PART_CONFIG[0].id}
        progress={progress}
        explodeX={PART_CONFIG[0].explodeX}
        explodeY={PART_CONFIG[0].explodeY}
        staggerIndex={0}
        onClick={() => handlePartClick(0)}
      >
        {/* Hit area */}
        <rect x="430" y="258" width="60" height="50" fill="transparent" />
        {/* Monitor frame */}
        <rect x="435" y="262" width="50" height="36" rx="4" fill="url(#part-blue)" stroke="#71717A" strokeWidth="1.5" />
        {/* Screen */}
        <rect x="440" y="267" width="40" height="22" rx="2" fill="#1D1D1F" opacity="0.85" />
        {/* Screen content lines */}
        <line x1="444" y1="274" x2="470" y2="274" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
        <line x1="444" y1="279" x2="465" y2="279" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
        <line x1="444" y1="283" x2="460" y2="283" stroke="#93C5FD" strokeWidth="1" opacity="0.4" />
        {/* Stand */}
        <rect x="455" y="292" width="10" height="4" rx="1" fill="#A1A1AA" />
      </PartGroup>

      {/* Part 1: ECU Chip - Under hood near engine */}
      <PartGroup
        id={PART_CONFIG[1].id}
        progress={progress}
        explodeX={PART_CONFIG[1].explodeX}
        explodeY={PART_CONFIG[1].explodeY}
        staggerIndex={1}
        onClick={() => handlePartClick(1)}
      >
        <rect x="295" y="268" width="56" height="48" fill="transparent" />
        {/* ECU box */}
        <rect x="300" y="272" width="46" height="38" rx="4" fill="url(#part-indigo)" stroke="#71717A" strokeWidth="1.5" />
        {/* Chip pattern */}
        <rect x="312" y="282" width="22" height="18" rx="2" fill="#1D1D1F" opacity="0.3" />
        {/* Pins */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`pin-t-${i}`} x={310 + i * 7} y={272} width="3" height="5" fill="#D4D4D8" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={`pin-b-${i}`} x={310 + i * 7} y={305} width="3" height="5" fill="#D4D4D8" />
        ))}
        {/* Circuit traces */}
        <line x1="315" y1="288" x2="330" y2="288" stroke="#C4B5FD" strokeWidth="0.8" opacity="0.6" />
        <line x1="320" y1="293" x2="328" y2="293" stroke="#C4B5FD" strokeWidth="0.8" opacity="0.6" />
      </PartGroup>

      {/* Part 2: AC Compressor - Front of engine bay */}
      <PartGroup
        id={PART_CONFIG[2].id}
        progress={progress}
        explodeX={PART_CONFIG[2].explodeX}
        explodeY={PART_CONFIG[2].explodeY}
        staggerIndex={2}
        onClick={() => handlePartClick(2)}
      >
        <rect x="245" y="310" width="54" height="50" fill="transparent" />
        {/* Compressor body */}
        <circle cx="272" cy="335" r="22" fill="url(#part-cyan)" stroke="#71717A" strokeWidth="1.5" />
        {/* Inner circle */}
        <circle cx="272" cy="335" r="12" fill="#0891B2" opacity="0.4" stroke="#71717A" strokeWidth="1" />
        {/* Center bolt */}
        <circle cx="272" cy="335" r="4" fill="#D4D4D8" stroke="#71717A" strokeWidth="0.5" />
        {/* Cooling fins */}
        {[0, 45, 90, 135].map((angle) => (
          <line
            key={`fin-${angle}`}
            x1={272 + 12 * Math.cos((angle * Math.PI) / 180)}
            y1={335 + 12 * Math.sin((angle * Math.PI) / 180)}
            x2={272 + 20 * Math.cos((angle * Math.PI) / 180)}
            y2={335 + 20 * Math.sin((angle * Math.PI) / 180)}
            stroke="#A1A1AA"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
        {/* Pipe connector */}
        <rect x="290" y="330" width="10" height="6" rx="2" fill="#06B6D4" stroke="#71717A" strokeWidth="0.5" />
      </PartGroup>

      {/* Part 3: Wiring Harness - Running through the car */}
      <PartGroup
        id={PART_CONFIG[3].id}
        progress={progress}
        explodeX={PART_CONFIG[3].explodeX}
        explodeY={PART_CONFIG[3].explodeY}
        staggerIndex={3}
        onClick={() => handlePartClick(3)}
      >
        <rect x="380" y="350" width="280" height="50" fill="transparent" />
        {/* Main harness trunk */}
        <path
          d="M400 375 Q450 365 520 370 Q590 375 640 368"
          fill="none"
          stroke="url(#part-emerald)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Branch wires */}
        <path d="M450 370 L440 355" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        <path d="M520 370 L530 385" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
        <path d="M560 372 L555 355" fill="none" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M600 370 L610 385" fill="none" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M480 368 L475 385" fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
        {/* Connectors */}
        <circle cx="400" cy="375" r="4" fill="#D4D4D8" stroke="#71717A" strokeWidth="1" />
        <circle cx="640" cy="368" r="4" fill="#D4D4D8" stroke="#71717A" strokeWidth="1" />
        <rect x="437" y="352" width="8" height="6" rx="1" fill="#A1A1AA" stroke="#71717A" strokeWidth="0.5" />
      </PartGroup>

      {/* Part 4: Sensors - Distributed at wheel and engine areas */}
      <PartGroup
        id={PART_CONFIG[4].id}
        progress={progress}
        explodeX={PART_CONFIG[4].explodeX}
        explodeY={PART_CONFIG[4].explodeY}
        staggerIndex={4}
        onClick={() => handlePartClick(4)}
      >
        <rect x="670" y="360" width="80" height="60" fill="transparent" />
        {/* Wheel speed sensor */}
        <circle cx="700" cy="395" r="10" fill="url(#part-amber)" stroke="#71717A" strokeWidth="1.5" />
        <circle cx="700" cy="395" r="4" fill="#1D1D1F" opacity="0.3" />
        {/* Signal waves */}
        <path d="M714 395 Q720 388 726 395" fill="none" stroke="#F59E0B" strokeWidth="1.2" opacity="0.6" />
        <path d="M716 395 Q724 385 732 395" fill="none" stroke="#FCD34D" strokeWidth="1" opacity="0.4" />
        {/* Engine sensor */}
        <rect x="720" y="368" width="18" height="12" rx="3" fill="url(#part-amber)" stroke="#71717A" strokeWidth="1" />
        <circle cx="729" cy="374" r="3" fill="#1D1D1F" opacity="0.3" />
        {/* Wire from sensor */}
        <path d="M700 385 L700 378 L720 374" fill="none" stroke="#A1A1AA" strokeWidth="1" strokeLinecap="round" />
      </PartGroup>

      {/* Part 5: Starter / Alternator - Near engine block */}
      <PartGroup
        id={PART_CONFIG[5].id}
        progress={progress}
        explodeX={PART_CONFIG[5].explodeX}
        explodeY={PART_CONFIG[5].explodeY}
        staggerIndex={5}
        onClick={() => handlePartClick(5)}
      >
        <rect x="318" y="335" width="54" height="54" fill="transparent" />
        {/* Alternator body */}
        <circle cx="345" cy="362" r="22" fill="url(#part-rose)" stroke="#71717A" strokeWidth="1.5" />
        {/* Stator ring */}
        <circle cx="345" cy="362" r="15" fill="none" stroke="#FDA4AF" strokeWidth="2" opacity="0.5" />
        {/* Rotor */}
        <circle cx="345" cy="362" r="7" fill="#F43F5E" opacity="0.5" stroke="#71717A" strokeWidth="1" />
        {/* Center shaft */}
        <circle cx="345" cy="362" r="3" fill="#D4D4D8" />
        {/* Mounting bracket */}
        <rect x="363" y="355" width="8" height="14" rx="2" fill="#A1A1AA" stroke="#71717A" strokeWidth="0.5" />
        {/* Terminal posts */}
        <rect x="338" y="339" width="6" height="4" rx="1" fill="#D4D4D8" stroke="#71717A" strokeWidth="0.5" />
        <rect x="350" y="339" width="6" height="4" rx="1" fill="#D4D4D8" stroke="#71717A" strokeWidth="0.5" />
      </PartGroup>

      {/* Part 6: Alarm Module - Near dashboard */}
      <PartGroup
        id={PART_CONFIG[6].id}
        progress={progress}
        explodeX={PART_CONFIG[6].explodeX}
        explodeY={PART_CONFIG[6].explodeY}
        staggerIndex={6}
        onClick={() => handlePartClick(6)}
      >
        <rect x="490" y="260" width="50" height="44" fill="transparent" />
        {/* Module box */}
        <rect x="495" y="265" width="40" height="32" rx="4" fill="url(#part-violet)" stroke="#71717A" strokeWidth="1.5" />
        {/* Shield icon on the module */}
        <path
          d="M515 273 L507 277 L507 284 Q507 289 515 292 Q523 289 523 284 L523 277 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          opacity="0.7"
        />
        {/* Check mark inside shield */}
        <path d="M511 282 L514 285 L520 279" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* LED indicator */}
        <circle cx="530" cy="272" r="2" fill="#F43F5E" opacity="0.7" />
      </PartGroup>

      {/* Part 7: BSI/BCM Electronic Module - Behind dashboard */}
      <PartGroup
        id={PART_CONFIG[7].id}
        progress={progress}
        explodeX={PART_CONFIG[7].explodeX}
        explodeY={PART_CONFIG[7].explodeY}
        staggerIndex={7}
        onClick={() => handlePartClick(7)}
      >
        <rect x="545" y="275" width="56" height="44" fill="transparent" />
        {/* Module housing */}
        <rect x="550" y="280" width="46" height="34" rx="3" fill="url(#part-teal)" stroke="#71717A" strokeWidth="1.5" />
        {/* PCB pattern */}
        <rect x="556" y="286" width="34" height="22" rx="2" fill="#0D9488" opacity="0.3" />
        {/* Circuit board traces */}
        <line x1="558" y1="292" x2="575" y2="292" stroke="#5EEAD4" strokeWidth="0.8" opacity="0.5" />
        <line x1="565" y1="288" x2="565" y2="302" stroke="#5EEAD4" strokeWidth="0.8" opacity="0.5" />
        <line x1="570" y1="298" x2="585" y2="298" stroke="#5EEAD4" strokeWidth="0.8" opacity="0.5" />
        {/* IC chip */}
        <rect x="568" y="290" width="12" height="8" rx="1" fill="#1D1D1F" opacity="0.4" />
        {/* Connector pins at bottom */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`bpin-${i}`} x={558 + i * 7} y={310} width="3" height="4" fill="#D4D4D8" />
        ))}
      </PartGroup>
    </svg>
  )
}
