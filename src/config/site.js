export const siteConfig = {
  name: "Autoelektrika E-Drive",
  shortName: "E-Drive",
  tagline: "Kompletna dijagnostika i popravka autoelektrike",
  description: "Profesionalna autoelektrika u Gradačcu. Kompjuterska dijagnostika, chip tuning, klima servis i popravka svih elektro sistema na vozilima.",

  contact: {
    phone: "+387 XX XXX XXX",
    email: "info@edrive-servis.ba",
    address: "Gradačac, BiH 76250",
    workingHours: {
      weekdays: "Pon - Pet: 08:00 - 17:00",
      saturday: "Sub: 08:00 - 13:00",
      sunday: "Ned: Zatvoreno",
    },
  },

  social: {
    instagram: "https://www.instagram.com/edrive.servis",
  },

  nav: [
    { name: "Početna", path: "/" },
    { name: "Usluge", path: "/usluge" },
    { name: "O Nama", path: "/o-nama" },
    { name: "Galerija", path: "/galerija" },
    { name: "Kontakt", path: "/kontakt" },
  ],

  stats: [
    { value: 10, suffix: "+", label: "Godina iskustva" },
    { value: 2000, suffix: "+", label: "Zadovoljnih klijenata" },
    { value: 5000, suffix: "+", label: "Izvršenih dijagnostika" },
    { value: 100, suffix: "%", label: "Posvećenost kvalitetu" },
  ],

  services: [
    {
      id: "dijagnostika",
      title: "Kompjuterska Dijagnostika",
      icon: "Monitor",
      category: "Dijagnostika",
      description: "Precizno očitavanje i analiza svih elektronskih sistema vašeg vozila pomoću najnovije dijagnostičke opreme.",
      features: [
        "Očitavanje i brisanje grešaka",
        "Live data analiza",
        "Svi protokoli (OBD2, EOBD)",
        "Dijagnostika svih sistema u vozilu",
      ],
    },
    {
      id: "chip-tuning",
      title: "Chip Tuning / ECU Remapping",
      icon: "Cpu",
      category: "Chip Tuning",
      description: "Profesionalno remapiranje ECU jedinice za optimalne performanse i potrošnju goriva.",
      features: [
        "Povećanje snage i obrtnog momenta",
        "Optimizacija potrošnje goriva",
        "DPF / EGR / AdBlue rješenja",
        "Stage 1 i Stage 2 tuning",
      ],
    },
    {
      id: "klima",
      title: "Auto Klima Servis",
      icon: "Snowflake",
      category: "Klima Servis",
      description: "Kompletan servis auto klima sistema - od punjenja do popravke i zamjene komponenti.",
      features: [
        "Punjenje klima sistema",
        "Detekcija i popravka curenja",
        "Zamjena kompresora i dijelova",
        "Dezinfekcija klima sistema",
      ],
    },
    {
      id: "instalacije",
      title: "Elektro Instalacije",
      icon: "Cable",
      category: "Elektro Radovi",
      description: "Popravka i ugradnja kompletnih elektro instalacija na svim tipovima vozila.",
      features: [
        "Popravka kablova i instalacija",
        "Ugradnja dodatne opreme",
        "Dijagnostika kratkih spojeva",
        "Kompletno rekabliranje",
      ],
    },
    {
      id: "senzori",
      title: "Senzori i Aktuatori",
      icon: "Activity",
      category: "Dijagnostika",
      description: "Dijagnostika, kalibracija i zamjena svih vrsta senzora i aktuatora u vozilu.",
      features: [
        "Lambda sonde, MAP, MAF senzori",
        "ABS i ESP senzori",
        "Kalibracija sistema",
        "Zamjena i programiranje",
      ],
    },
    {
      id: "starteri",
      title: "Starteri i Alternatori",
      icon: "BatteryCharging",
      category: "Elektro Radovi",
      description: "Dijagnostika sistema punjenja, remont i zamjena startera, alternatora i regulatora.",
      features: [
        "Dijagnostika sistema punjenja",
        "Remont i zamjena",
        "Regulatori napona",
        "Provjera akumulatora",
      ],
    },
    {
      id: "alarmi",
      title: "Alarmi i Immobilizeri",
      icon: "ShieldCheck",
      category: "Elektro Radovi",
      description: "Ugradnja alarma, programiranje ključeva i rješavanje problema sa immobilizer sistemima.",
      features: [
        "Ugradnja auto alarma",
        "Programiranje ključeva",
        "Immobilizer rješenja",
        "Centralno zaključavanje",
      ],
    },
    {
      id: "moduli",
      title: "Moduli i Elektronika",
      icon: "CircuitBoard",
      category: "Dijagnostika",
      description: "Popravka i programiranje elektronskih modula - BSI, BCM, komfortna elektronika i više.",
      features: [
        "Popravka elektronskih modula",
        "BSI / BCM moduli",
        "Komfortna elektronika",
        "Električni podizači stakala",
      ],
    },
  ],
}
