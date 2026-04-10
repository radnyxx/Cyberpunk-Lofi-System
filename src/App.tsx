import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import type {
  Track,
  TimeCode,
  PixelButtonProps,
  VHSFaderProps,
  NowPlayingTickerProps,
  VideoContainerProps,
  WaveformDisplayProps,
} from '../types';
import {
  TRACKS,
  VIDEOS,
  GLITCH_DURATION_MS,
  VU_SEGMENT_COUNT,
  VU_GREEN_THRESHOLD,
  VU_YELLOW_THRESHOLD,
} from '../constants';

// ─── Sound Effects ────────────────────────────────────────────────────────────

let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContextInstance) {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextInstance;
  } catch (e) {
    return null;
  }
}

function playClickSound(frequency = 800, duration = 0.04) {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.value = frequency;
    osc.type = 'square';
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silent fail
  }
}

// ─── Global CSS injection ─────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=Orbitron:wght@400;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --neon-purple: #b44fff;
    --neon-cyan: #00fff2;
    --neon-pink: #ff2d78;
    --neon-green: #00ff88;
    --neon-yellow: #ffcc00;
    --dark-bg: #0d0d0d;
    --dark-surface: #141414;
    --dark-card: #1a1a1a;
    --dark-border: #2a2a2a;
    --text-primary: #e8e8e8;
    --text-muted: #666;
  }

  body {
    background: var(--dark-bg);
    font-family: 'Share Tech Mono', monospace;
    color: var(--text-primary);
    overflow: hidden;
    height: 100vh;
    margin: 0;
    padding: 0;
  }

  #root {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  @keyframes crt-flicker {
    0%   { opacity: 1; }
    92%  { opacity: 1; }
    93%  { opacity: 0.96; }
    94%  { opacity: 1; }
    96%  { opacity: 0.98; }
    100% { opacity: 1; }
  }

  @keyframes scanline-scroll {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  @keyframes vhs-rgb {
    0%   { text-shadow: 2px 0 #ff2d78, -2px 0 #00fff2; }
    25%  { text-shadow: -2px 0 #ff2d78, 2px 0 #00fff2; }
    50%  { text-shadow: 2px 0 #00fff2, -2px 0 #ff2d78; }
    75%  { text-shadow: 0 0 transparent; }
    100% { text-shadow: 2px 0 #ff2d78, -2px 0 #00fff2; }
  }

  @keyframes neon-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.7; }
  }

  @keyframes vhs-tracking {
    0%   { transform: translateX(0) skewX(0deg); }
    10%  { transform: translateX(2px) skewX(0.3deg); }
    20%  { transform: translateX(-1px) skewX(-0.2deg); }
    30%  { transform: translateX(3px) skewX(0.1deg); }
    40%  { transform: translateX(0) skewX(0deg); }
    100% { transform: translateX(0) skewX(0deg); }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  .vhs-text { animation: vhs-rgb 3s infinite; }
  .neon-pulse { animation: neon-pulse 2s ease-in-out infinite; }
  .blink-cursor { animation: blink 1s step-end infinite; }
  .video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
  }

  .video-overlay > * {
    pointer-events: auto;
  }

  .pixel-btn {
    font-family: 'VT323', monospace;
    cursor: pointer;
    border: 2px solid;
    outline: none;
    background: transparent;
    position: relative;
    image-rendering: pixelated;
    transition: background 0.1s;
  }

  input[type="range"].vhs-fader {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    outline: none;
  }

  input[type="range"].vhs-fader::-webkit-slider-runnable-track {
    height: 4px;
    background: #2a2a2a;
    border: 1px solid #444;
  }

  input[type="range"].vhs-fader::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 32px;
    background: #1a1a1a;
    border: 2px solid var(--neon-purple);
    border-radius: 0;
    margin-top: -14px;
    box-shadow: 0 0 8px var(--neon-purple), inset 0 0 4px rgba(180,79,255,0.3);
    image-rendering: pixelated;
  }

  input[type="range"].vhs-fader::-moz-range-thumb {
    width: 14px;
    height: 32px;
    background: #1a1a1a;
    border: 2px solid var(--neon-purple);
    border-radius: 0;
    box-shadow: 0 0 8px var(--neon-purple);
  }

  input[type="range"].vhs-fader::-moz-range-track {
    height: 4px;
    background: #2a2a2a;
    border: 1px solid #444;
  }

  @media (max-width: 640px) {
    body { overflow: auto; }
  }
`;

function InjectStyles() {
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, []);
  return null;
}

// ─── ScanlineOverlay ──────────────────────────────────────────────────────────

function ScanlineOverlay() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, height: '3px',
        background: 'rgba(255,255,255,0.04)',
        animation: 'scanline-scroll 6s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        boxShadow: 'inset 0 0 80px rgba(180,79,255,0.06), inset 0 0 30px rgba(0,255,242,0.04)',
      }} />
    </div>
  );
}

// ─── VHSLabel ─────────────────────────────────────────────────────────────────

function VHSLabel({ text }: { text: string }) {
  return (
    <div style={{
      position: 'fixed', top: 55, left: 10, zIndex: 200,
      fontFamily: "'VT323', monospace", fontSize: 16, color: '#fff',
      opacity: 1, letterSpacing: 3,
      textShadow: '2px 0 #ff2d78, -2px 0 #00fff2, 0 0 10px #ff2d78',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: '#ff2d78', display: 'inline-block',
        boxShadow: '0 0 8px #ff2d78',
        animation: 'blink 1.5s step-end infinite',
      }} />
      {text}
    </div>
  );
}

// ─── TimeCodeDisplay ──────────────────────────────────────────────────────────

function TimeCodeDisplay({ playing }: { playing: boolean }) {
  const [tc, setTc] = useState<TimeCode>({ h: '00', m: '00', s: '00', f: '00' });
  const startRef = useRef(Date.now());
  const pausedRef = useRef(0);
  const lastPauseRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      lastPauseRef.current = Date.now();
      return;
    }
    if (lastPauseRef.current !== null) {
      pausedRef.current += Date.now() - lastPauseRef.current;
      lastPauseRef.current = null;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current - pausedRef.current) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      const f = String(Math.floor(Date.now() / 33) % 30).padStart(2, '0');
      setTc({ h, m, s, f });
    }, 33);
    return () => clearInterval(interval);
  }, [playing]);

  return (
    <div style={{
      position: 'fixed', top: 55, right: 10, zIndex: 200,
      fontFamily: "'Share Tech Mono', monospace", fontSize: 14,
      color: '#fff', letterSpacing: 1, opacity: 1,
    }}>
      {tc.h}:{tc.m}:{tc.s}:{tc.f}
    </div>
  );
}

// ─── PixelButton ──────────────────────────────────────────────────────────────

function PixelButton({ label, icon, onClick, color = '#b44fff', size = 'md', disabled }: PixelButtonProps) {
  const ctrl = useAnimation();

  const handleHover = () => {
    ctrl.start({ x: [0, -2, 2, -1, 1, 0], transition: { duration: 0.3, ease: 'linear' } });
  };

  const handleClick = async () => {
    await ctrl.start({ scale: 0.88, transition: { duration: 0.06 } });
    await ctrl.start({ scale: 1, transition: { duration: 0.1, type: 'spring' } });
    onClick?.();
  };

  const sz = size === 'lg' ? { w: 72, h: 56, fs: 28 }
    : size === 'sm' ? { w: 44, h: 36, fs: 18 }
    : { w: 58, h: 48, fs: 24 };

  return (
    <motion.button
      animate={ctrl}
      onHoverStart={handleHover}
      onClick={handleClick}
      disabled={disabled}
      className="pixel-btn"
      style={{
        width: sz.w, height: sz.h, fontSize: sz.fs,
        color: disabled ? '#444' : color,
        borderColor: disabled ? '#333' : color,
        boxShadow: disabled ? 'none' : `0 0 10px ${color}55, inset 0 0 10px ${color}11`,
        fontFamily: "'VT323', monospace",
      }}
      whileTap={{ scale: 0.9 }}
    >
      {icon ?? label}
    </motion.button>
  );
}

// ─── NowPlayingTicker ─────────────────────────────────────────────────────────

function NowPlayingTicker({ track, playing }: NowPlayingTickerProps) {
  const text = `▶  ${track.title}  ·  ${track.artist}  ·  ${track.bpm} BPM  ·  `.repeat(4);

  return (
    <div style={{
      background: '#0a0a0a',
      borderTop: '1px solid #2a2a2a',
      borderBottom: '1px solid #2a2a2a',
      padding: '6px 0', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2,
        background: 'linear-gradient(to right, #0a0a0a 80%, transparent)',
        width: 200, display: 'flex', alignItems: 'center', paddingLeft: 12,
      }}>
        <span style={{
          fontFamily: "'VT323', monospace", fontSize: 14,
          color: track.color, letterSpacing: 0,
          textShadow: `0 0 8px ${track.color}`,
        }}>
         NOW PLAYING
        </span>
      </div>

      <motion.div
        style={{
          display: 'flex', whiteSpace: 'nowrap',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 13, color: '#aaa', paddingLeft: 110,
        }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: playing ? 18 : 40, ease: 'linear', repeat: Infinity }}
        key={track.id}
      >
        {text}
      </motion.div>

      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        background: 'linear-gradient(to left, #0a0a0a 80%, transparent)',
        width: 100,
      }} />
    </div>
  );
}

// ─── VHSFader ─────────────────────────────────────────────────────────────────

function VHSFader({ value, onChange, label, color = '#b44fff' }: VHSFaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontFamily: "'VT323', monospace", fontSize: 13, color, letterSpacing: 1,
        textShadow: `0 0 6px ${color}`,
      }}>
        {label}
      </span>
      <div style={{ position: 'relative', width: 40, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <div key={v} style={{
            position: 'absolute', top: `${100 - v}%`, left: '50%',
            transform: 'translateX(-50%)',
            width: v % 50 === 0 ? 14 : 8, height: 1,
            background: v % 50 === 0 ? '#444' : '#2a2a2a',
          }} />
        ))}
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="vhs-fader"
          style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 28, height: 90 }}
        />
      </div>
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: '#555' }}>
        {value}
      </span>
    </div>
  );
}

// ─── VideoContainer ───────────────────────────────────────────────────────────

function VideoContainer({ videoIdx, playing, glitching }: VideoContainerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = 0.85;
    if (playing) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [playing, videoIdx]);

  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "16/9",
      background: '#000', overflow: 'visible',
      border: '1px solid #2a2a2a',
      boxShadow: '0 0 40px rgba(180,79,255,0.15), 0 0 80px rgba(0,0,0,0.8)',
    }}>
      <motion.div
        key={videoIdx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <video
          ref={videoRef}
          src={VIDEOS[videoIdx % VIDEOS.length].src}
          autoPlay={playing}
          loop muted playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'saturate(0.6) contrast(1.1) brightness(0.7)',
          }}
        />
      </motion.div>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(180,79,255,0.08) 0%, rgba(0,255,242,0.05) 50%, rgba(255,45,120,0.06) 100%)',
        mixBlendMode: 'overlay', pointerEvents: 'none',
      }} />

      <AnimatePresence>
        {glitching && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 15,
              background: 'rgba(180,79,255,0.2)',
              mixBlendMode: 'screen', pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <ScanlineOverlay />

      {/* VHS tracking artifact lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 8 }}>
        {([15, 45, 72] as const).map((top, i) => (
          <div key={i} style={{
            position: 'absolute', left: 0, right: 0, top: `${top}%`, height: 2,
            background: `rgba(${i === 0 ? '0,255,242' : i === 1 ? '180,79,255' : '255,45,120'}, 0.12)`,
            animation: `vhs-tracking ${2 + i * 0.7}s infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── WaveformDisplay ──────────────────────────────────────────────────────────

function WaveformDisplay({ playing, color }: WaveformDisplayProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, padding: '0 4px' }}>
      {Array.from({ length: 32 }).map((_, i) => {
        const h = playing ? 20 + Math.sin(i * 0.8) * 10 + Math.random() * 8 : 4;
        return (
          <motion.div
            key={i}
            animate={{ height: playing ? [4, h, h * 0.7, h * 1.1, 4] : 4 }}
            transition={{
              duration: playing ? 0.8 + (i % 4) * 0.2 : 0.3,
              repeat: playing ? Infinity : 0,
              delay: i * 0.03, ease: 'easeInOut',
            }}
            style={{ width: 3, background: color, minHeight: 3, boxShadow: `0 0 4px ${color}`, borderRadius: 1 }}
          />
        );
      })}
    </div>
  );
}

// ─── MixerModal ───────────────────────────────────────────────────────────────

function MixerModal({ isOpen, volume, reverb, onVolumeChange, onReverbChange, onClose }: {
  isOpen: boolean;
  volume: number;
  reverb: number;
  onVolumeChange: (value: number) => void;
  onReverbChange: (value: number) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              zIndex: 1000, backdropFilter: "blur(2px)",
            }}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1001,
              background: "#141414",
              border: "2px solid #2a2a2a",
              boxShadow: "0 0 60px rgba(180,79,255,0.3), 0 0 120px rgba(0,0,0,0.9)",
              padding: "24px",
              borderRadius: "8px",
              minWidth: 300,
            }}
          >
            {/* Title */}
            <div style={{
              fontFamily: "'VT323', monospace",
              fontSize: 18, color: "#00fff2", letterSpacing: 2,
              textShadow: "0 0 8px rgba(0,255,242,0.8)",
              marginBottom: 20, textAlign: "center",
            }}>
              CONTROLS
            </div>

            {/* Faders Container */}
            <div style={{
              display: "flex", gap: 40, justifyContent: "center", alignItems: "flex-end",
              marginBottom: 20,
            }}>
              <VHSFader
                value={volume}
                onChange={onVolumeChange}
                label="VOLUME"
                color="#b44fff"
              />
              <VHSFader
                value={reverb}
                onChange={onReverbChange}
                label="REVERB"
                color="#00fff2"
              />
            </div>

            {/* Close Button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 14, letterSpacing: 1,
                  background: "transparent",
                  border: "2px solid #666",
                  color: "#999",
                  padding: "6px 16px",
                  cursor: "pointer",
                  boxShadow: "0 0 8px rgba(100,100,100,0.3)",
                  borderRadius: "4px",
                }}
              >
                CLOSE
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── GlitchScreen ─────────────────────────────────────────────────────────────

function GlitchScreen({ glitching, children }: { glitching: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      animate={glitching ? {
        x: [0, -6, 8, -4, 6, -2, 0],
        filter: ['none', 'hue-rotate(90deg) saturate(2)', 'hue-rotate(180deg) saturate(3) brightness(1.5)', 'hue-rotate(270deg) saturate(1.5)', 'none'],
      } : {}}
      transition={{ duration: 0.5, times: [0, 0.1, 0.3, 0.6, 1] }}
    >
      {glitching && (
        <>
          <motion.div
            style={{
              position: 'absolute', inset: 0, zIndex: 999,
              clipPath: 'inset(30% 0 50% 0)', pointerEvents: 'none',
              mixBlendMode: 'screen', background: 'rgba(0,255,242,0.08)',
            }}
            animate={{ x: [-20, 20, -15, 10, 0], opacity: [0.8, 0.6, 0.9, 0.4, 0] }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            style={{
              position: 'absolute', inset: 0, zIndex: 998,
              background: 'rgba(180,79,255,0.1)', clipPath: 'inset(60% 0 10% 0)',
              pointerEvents: 'none', mixBlendMode: 'screen',
            }}
            animate={{ x: [15, -20, 10, -5, 0], opacity: [0.9, 0.7, 0.8, 0.3, 0] }}
            transition={{ duration: 0.5, delay: 0.05 }}
          />
        </>
      )}
      {children}
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [trackIdx, setTrackIdx] = useState(0);
  const [videoIdx, setVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [reverb, setReverb] = useState(40);
  const [glitching, setGlitching] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

useEffect(() => {
  if (audioRef.current) audioRef.current.volume = volume / 100;
}, [volume]);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  if (playing) audio.play().catch(() => {});
  else audio.pause();
}, [playing]);

useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;
  audio.load();
  if (playing) audio.play().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [trackIdx]);

  const currentTrack: Track = TRACKS[trackIdx];

  const handleNext = useCallback(() => {
    playClickSound(900, 0.05);
    setTrackIdx((i) => (i + 1) % TRACKS.length);
    setVideoIdx((i) => (i + 1) % VIDEOS.length);
  }, []);

  const handlePrev = useCallback(() => {
    playClickSound(700, 0.05);
    setTrackIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);
    setVideoIdx((i) => (i - 1 + VIDEOS.length) % VIDEOS.length);
  }, []);

  const handleGlitch = useCallback(() => {
    if (glitching) return;
    playClickSound(1200, 0.1);
    setGlitching(true);
    setTimeout(() => setGlitching(false), GLITCH_DURATION_MS);
  }, [glitching]);

  return (
    <>
      <InjectStyles />
      <audio
       ref={audioRef}
       src={currentTrack.audioSrc}
       loop
       preload="auto"
       style={{ display: 'none' }}
       onEnded={handleNext}
      />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d0d', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(180,79,255,0.06) 0%, transparent 70%)',
        }} />

        {/* Header */}
        <div style={{
          background: '#0d0d0d', borderBottom: '1px solid #2a2a2a',
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 10, position: 'relative', minHeight: 50, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['#ff2d78', '#ffcc00', '#00ff88'] as const).map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, background: c, borderRadius: '50%', boxShadow: `0 0 6px ${c}` }} />
              ))}
            </div>
            <span style={{
              fontFamily: "'VT323', monospace", fontSize: 15,
              color: '#b44fff', letterSpacing: 3,
              textShadow: '0 0 12px rgba(180,79,255,0.8)',
            }}>
              CYBERPUNK LOFI SYSTEM
            </span>
            <span className="blink-cursor" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: '#555' }}>_</span>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: '#555', letterSpacing: 1 }}>
            TRACK {String(trackIdx + 1).padStart(2, '0')}/{String(TRACKS.length).padStart(2, '0')}
          </div>
        </div>

        {/* Video Container - fills middle space */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, width: '100%' }}>
          <GlitchScreen glitching={glitching}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VideoContainer videoIdx={videoIdx} playing={playing} glitching={glitching} />

            {/* Overlay Controls */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Play/Pause/Previous/Next buttons - aligned horizontally */}
              <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 10, pointerEvents: 'auto', alignItems: 'center' }}>
                <motion.button
                  onClick={handlePrev}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 16, letterSpacing: 1,
                    background: 'transparent', border: 'none',
                    color: '#00fff2', padding: '4px 8px', cursor: 'pointer',
                    boxShadow: '0 0 8px rgba(0,255,242,0.3)',
                    textShadow: '0 0 4px rgba(0,255,242,0.6)',
                  }}
                >
                  ◁◁
                </motion.button>

                <motion.button
                  onClick={() => {
                    playClickSound(850, 0.06);
                    setPlaying((p) => !p);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 20, letterSpacing: 1,
                    background: 'transparent', border: 'none',
                    color: playing ? '#ff2d78' : '#00ff88', 
                    padding: '6px 10px', cursor: 'pointer',
                    boxShadow: `0 0 12px ${playing ? 'rgba(255,45,120,0.4)' : 'rgba(0,255,136,0.4)'}`,
                    textShadow: `0 0 6px ${playing ? 'rgba(255,45,120,0.6)' : 'rgba(0,255,136,0.6)'}`,
                  }}
                >
                  {playing ? '!!' : '▶'}
                </motion.button>

                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 16, letterSpacing: 1,
                    background: 'transparent', border: 'none',
                    color: '#00fff2', padding: '4px 8px', cursor: 'pointer',
                    boxShadow: '0 0 8px rgba(0,255,242,0.3)',
                    textShadow: '0 0 4px rgba(0,255,242,0.6)',
                  }}
                >
                  ▷▷
                </motion.button>
              </div>

              {/* Glitch Button - Upper right */}
              <motion.button
                onClick={handleGlitch}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  position: 'absolute', top: 35, right: 10,
                  fontFamily: "'VT323', monospace",
                  fontSize: 15, letterSpacing: 2,
                  background: 'transparent', border: '2px solid #ff2d78',
                  color: '#ff2d78', padding: '6px 14px', cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(255,45,120,0.4)',
                  textShadow: '0 0 8px rgba(255,45,120,0.8)',
                  pointerEvents: 'auto',
                }}
                animate={glitching ? {
                  boxShadow: ['0 0 12px rgba(255,45,120,0.4)', '0 0 30px rgba(255,45,120,0.9)', '0 0 12px rgba(255,45,120,0.4)'],
                  color: ['#ff2d78', '#fff', '#ff2d78'],
                } : {}}
                transition={{ duration: 0.2 }}
              >
                 GLITCH
              </motion.button>

              {/* Mix Button - Right side below glitch */}
              <motion.button
                onClick={() => {
                  playClickSound(1100, 0.08);
                  setShowMixer(!showMixer);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  position: 'absolute', top: 80, right: 10,
                  fontFamily: "'VT323', monospace",
                  fontSize: 14, letterSpacing: 2,
                  background: "transparent",
                  border: `2px solid ${showMixer ? "#00fff2" : "#555"}`,
                  color: showMixer ? "#00fff2" : "#999",
                  padding: "6px 14px",
                  cursor: "pointer",
                  boxShadow: showMixer ? "0 0 12px rgba(0,255,242,0.6)" : "none",
                  textShadow: showMixer ? "0 0 8px rgba(0,255,242,0.8)" : "none",
                  pointerEvents: "auto",
                }}
              >
                🎚 MIX
              </motion.button>

              {/* VU Meter - Right side */}
              <div style={{ position: 'absolute', bottom: 40, right: 20, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'auto' }}>
                {(['L', 'R'] as const).map((ch) => (
                  <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: "'VT323', monospace", fontSize: 11,
                      color: "#555", width: 10,
                    }}>
                      {ch}
                    </span>
                    <div style={{
                      width: 80, height: 5, background: "#1a1a1a",
                      border: "1px solid #2a2a2a", overflow: "hidden",
                      display: "flex",
                    }}>
                      {Array.from({ length: 16 }).map((_, i) => {
                        const active = playing && i < Math.floor((volume / 100) * 16 * (0.8 + Math.sin(Date.now() / 200 + i) * 0.2));
                        const color = i < 11 ? "#00ff88" : i < 14 ? "#ffcc00" : "#ff2d78";
                        return (
                          <motion.div
                            key={i}
                            animate={{ opacity: playing ? [0.3, active ? 1 : 0.3] : 0.1 }}
                            transition={{ duration: 0.1, repeat: playing ? Infinity : 0, delay: i * 0.02 }}
                            style={{
                              flex: 1, height: "100%",
                              background: active ? color : "#222",
                              margin: "0 0.5px",
                              boxShadow: active ? `0 0 4px ${color}` : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mixer Controls Overlay - directly on video */}
              {showMixer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: "absolute", top: 145, right: 20,
                    zIndex: 1001,
                    display: "flex", gap: 24, justifyContent: "flex-end", alignItems: "flex-end",
                    pointerEvents: "auto",
                  }}
                >
                  <VHSFader
                    value={volume}
                    onChange={setVolume}
                    label="VOLUME"
                    color="#b44fff"
                  />
                  <VHSFader
                    value={reverb}
                    onChange={setReverb}
                    label="REVERB"
                    color="#00fff2"
                  />
                </motion.div>
              )}
            </div>
          </div>
          </GlitchScreen>
        </div>

        {/* VHS Label and Timecode - rendered outside GlitchScreen to prevent transform affectingfixed positioning */}
        <VHSLabel text={`${VIDEOS[videoIdx % VIDEOS.length].label} // VHS`} />
        <TimeCodeDisplay playing={playing} />

        {/* Footer with Now Playing Ticker */}
        <div style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', zIndex: 10, position: 'relative', flexShrink: 0 }}>
          <NowPlayingTicker track={currentTrack} playing={playing} />
          <div style={{
            background: '#0a0a0a', borderTop: '1px solid #1a1a1a',
            padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: '#333', letterSpacing: 1 }}>
              ZEN_CANVAS v1.0.0 // LO-FI SYSTEM
            </span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: '#333', letterSpacing: 1 }}>
              © {new Date().getFullYear()} RADNYX_X
            </span>
          </div>
        </div>

        {/* Global scanlines */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)',
        }} />
      </div>
    </>
  );
}

