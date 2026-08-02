import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ScrollScrubber from './ScrollScrubber.jsx';

// Real assets: the 60 frames shipped in this repo at /public/images/car/frames/.
// They are 2-digit padded (frame-00.jpg ... frame-59.jpg), so pad={2} here.
const MODE = new URLSearchParams(location.search).get('mode') || 'scrub';

function App() {
  const [p, setP] = useState(0);
  const hud = useRef(null);

  return (
    <>
      <div className="hud" ref={hud} id="hud">
        mode={MODE}{'\n'}progress={p.toFixed(3)}
      </div>

      <div className="pad">
        <h1>ScrollScrubber harness</h1>
        <p>Scroll down. The hero below is the real 60-frame sequence from this repo.</p>
      </div>

      <ScrollScrubber
        mode={MODE}
        srcPattern="/images/car/frames/frame-{i}.jpg"
        count={MODE === 'wipe' ? 2 : MODE === 'parallax' ? 3 : 60}
        pad={2}
        poster="/images/car/car-hero.jpg"
        reducedMotionFrame="/images/car/frames/frame-59.jpg"
        scrollRange={[0.1, 0.65]}
        lerp={0.08}
        sectionHeight="500vh"
        keyframeEvery={4}
        posterWidth={1280}
        posterHeight={720}
        ariaLabel="Automobil se rastavlja u slojeve dok skrolate"
        onProgress={setP}
      >
        <div className="badge">progress driven by --pw-progress</div>
      </ScrollScrubber>

      <div className="pad">
        <h2>After the hero</h2>
        <p>Static content so the section has somewhere to end.</p>
        <p style={{ height: '80vh' }} />
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
