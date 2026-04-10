
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import React from "react";
import './ZenCanvas.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Track {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  color: string;
  audioSrc: string;
}

interface Video {
  id: number;
  label: string;
  src: string;
  embed: null;
}

interface PixelButtonProps {
  label?: string;
  onClick?: () => void;
  color?: string;
  size?: "sm" | "md" | "lg";
  icon?: string;
  disabled?: boolean;
}

interface NowPlayingTickerProps {
  track: Track;
  playing: boolean;
}

interface VHSFaderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color?: string;
}

interface VideoContainerProps {
  videoIdx: number;
  playing: boolean;
  glitching: boolean;
}

interface WaveformDisplayProps {
  playing: boolean;
  color: string;
}

interface GlitchScreenProps {
  glitching: boolean;
  children: React.ReactNode;
}

const TRACKS: Track[] = [
  { id: 1, title: "spirit.mp3", artist: "CITY_GHOST", bpm: 72, color: "#b44fff", audioSrc: "/audio/spirit.mp3" },
  { id: 2, title: "player.mp3", artist: "VAPORWAVE_UNIT", bpm: 68, color: "#00fff2", audioSrc: "/audio/player.mp3" },
  { id: 3, title: "chill.mp3", artist: "SYNTH_ROID", bpm: 80, color: "#ff2d78", audioSrc: "/audio/chill.mp3" },
  { id: 4, title: "hiphop.mp3", artist: "NULL_POINTER", bpm: 64, color: "#ffcc00", audioSrc: "/audio/hiphop.mp3" },
  { id: 5, title: "lofi.mp3", artist: "RETRO_DEMON", bpm: 76, color: "#00ff88", audioSrc: "/audio/lofi.mp3" },
];

const VIDEOS: Video[] = [
  { id: 1, label: "RAINY WINDOW", src: "https://v1.pinimg.com/videos/iht/expMp4/3e/33/08/3e3308752ea0d513e394d8912f8e7ff5_720w.mp4", embed: null },
  { id: 2, label: "PIXEL KITTY", src: "https://v1.pinimg.com/videos/iht/expMp4/58/05/c9/5805c9aeb55a919fed06775e3589cd7a_720w.mp4", embed: null },
  { id: 3, label: "NEON NIGHT", src: "https://v1.pinimg.com/videos/iht/expMp4/61/42/e2/6142e2db23a0aa424af552b1b00ffa62_720w.mp4", embed: null }, 
  { id: 4, label: "FUTURAMA", src: "https://v1.pinimg.com/videos/iht/720p/6a/23/9a/6a239a716f38f2099b656f07a7469edd.mp4", embed: null }, 
  { id: 5, label: "CYBERPUNK CITY", src: "https://v1.pinimg.com/videos/mc/720p/c5/01/7d/c5017db22b5cffb58afc464fef1578ff.mp4", embed: null }, 

];

function ScanlineOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none", overflow: "hidden",
    }}>
      {/* Static scanlines */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
        pointerEvents: "none",
      }} />
      {/* Moving scanline beam */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: "3px",
        background: "rgba(255,255,255,0.04)",
        animation: "scanline-scroll 6s linear infinite",
        pointerEvents: "none",
      }} />
      {/* RGB vignette corners */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)",
        pointerEvents: "none",
      }} />
      {/* Subtle RGB shift edges */}
      <div style={{
        position: "absolute", inset: 0,
        boxShadow: "inset 0 0 80px rgba(180,79,255,0.06), inset 0 0 30px rgba(0,255,242,0.04)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

function VHSLabel({ text }: { text: string }) {
  return (
    <div style={{
      position: "absolute", top: 14, left: 14, zIndex: 20,
      fontFamily: "'VT323', monospace", fontSize: 18, color: "#fff",
      opacity: 0.85, letterSpacing: 2,
      textShadow: "2px 0 #ff2d78, -2px 0 #00fff2",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "#ff2d78", display: "inline-block",
        boxShadow: "0 0 6px #ff2d78",
        animation: "blink 1.5s step-end infinite",
      }} />
      {text}
    </div>
  );
}

function TimeCode({ playing }: { playing: boolean }) {
  const [time, setTime] = useState({ h: "00", m: "00", s: "00", f: "00" });
  const startRef = useRef<number>(Date.now());
  const pausedRef = useRef<number>(0);
  const lastPauseRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      lastPauseRef.current = Date.now();
      return;
    }
    if (lastPauseRef.current) {
      pausedRef.current += Date.now() - lastPauseRef.current;
      lastPauseRef.current = null;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current - pausedRef.current) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const s = String(elapsed % 60).padStart(2, "0");
      const f = String(Math.floor(Date.now() / 33) % 30).padStart(2, "0");
      setTime({ h, m, s, f });
    }, 33);
    return () => clearInterval(interval);
  }, [playing]);

  return (
    <div style={{
      position: "absolute", top: 14, right: 14, zIndex: 20,
      fontFamily: "'Share Tech Mono', monospace", fontSize: 13,
      color: "rgba(255,255,255,0.7)", letterSpacing: 1,
    }}>
      {time.h}:{time.m}:{time.s}:{time.f}
    </div>
  );
}

function PixelButton({ label, onClick, color = "#b44fff", size = "md", icon, disabled }: PixelButtonProps) {
  const ctrl = useAnimation();

  const handleHover = () => {
    ctrl.start({
      x: [0, -2, 2, -1, 1, 0],
      transition: { duration: 0.3, ease: "linear" },
    });
  };

  const handleClick = async () => {
    await ctrl.start({ scale: 0.88, transition: { duration: 0.06 } });
    await ctrl.start({ scale: 1, transition: { duration: 0.1, type: "spring" } });
    onClick?.();
  };

  const sz = size === "lg" ? { w: 72, h: 56, fs: 28 } :
             size === "sm" ? { w: 44, h: 36, fs: 18 } :
             { w: 58, h: 48, fs: 24 };

  return (
    <motion.button
      animate={ctrl}
      onHoverStart={handleHover}
      onClick={handleClick}
      disabled={disabled}
      className="pixel-btn"
      style={{
        width: sz.w, height: sz.h, fontSize: sz.fs,
        color: disabled ? "#444" : color,
        borderColor: disabled ? "#333" : color,
        boxShadow: disabled ? "none" : `0 0 10px ${color}55, inset 0 0 10px ${color}11`,
        fontFamily: "'VT323', monospace",
      }}
      whileTap={{ scale: 0.9 }}
    >
      {icon || label}
    </motion.button>
  );
}

function NowPlayingTicker({ track, playing }: NowPlayingTickerProps) {
  const text = `▶  ${track.title}  ·  ${track.artist}  ·  ${track.bpm} BPM  ·  `.repeat(4);

  return (
    <div style={{
      background: "#0a0a0a",
      borderTop: "1px solid #2a2a2a",
      borderBottom: "1px solid #2a2a2a",
      padding: "6px 0",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Ticker label */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2,
        background: "linear-gradient(to right, #0a0a0a 80%, transparent)",
        width: 100, display: "flex", alignItems: "center", paddingLeft: 12,
      }}>
        <span style={{
          fontFamily: "'VT323', monospace", fontSize: 14,
          color: track.color, letterSpacing: 1,
          textShadow: `0 0 8px ${track.color}`,
        }}>
          PLAYING
        </span>
      </div>

      <motion.div
        style={{
          display: "flex", whiteSpace: "nowrap",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 13, color: "#aaa", paddingLeft: 110,
        }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: playing ? 18 : 40, ease: "linear", repeat: Infinity }}
        key={track.id}
      >
        {text}
      </motion.div>

      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        background: "linear-gradient(to left, #0a0a0a 80%, transparent)",
        width: 20,
      }} />
    </div>
  );
}

function VHSFader({ value, onChange, label, color = "#b44fff" }: VHSFaderProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{
        fontFamily: "'VT323', monospace", fontSize: 13,
        color: color, letterSpacing: 1,
        textShadow: `0 0 6px ${color}`,
      }}>
        {label}
      </span>

      <div style={{
        position: "relative", width: 40, height: 100,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Track markings */}
        {[0, 25, 50, 75, 100].map((v) => (
          <div key={v} style={{
            position: "absolute",
            top: `${100 - v}%`,
            left: "50%", transform: "translateX(-50%)",
            width: v % 50 === 0 ? 14 : 8,
            height: 1,
            background: v % 50 === 0 ? "#444" : "#2a2a2a",
          }} />
        ))}
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="vhs-fader"
          style={{
            writingMode: "vertical-lr",
            direction: "rtl",
            width: 28,
            height: 90,
          }}
        />
      </div>

      <span style={{
        fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#555",
      }}>
        {value}
      </span>
    </div>
  );
}

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
      position: "relative", width: "100%", aspectRatio: "4/3",
      background: "#000", overflow: "hidden",
      border: "1px solid #2a2a2a",
      boxShadow: "0 0 40px rgba(180,79,255,0.15), 0 0 80px rgba(0,0,0,0.8)",
    }}>
      {/* Actual video */}
      <video
        ref={videoRef}
        key={videoIdx}
        src={VIDEOS[videoIdx % VIDEOS.length].src}
        autoPlay={playing}
        loop
        muted
        playsInline
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          filter: "saturate(0.6) contrast(1.1) brightness(0.7)",
          opacity: 0.85,
        }}
      />

      {/* VHS Color overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(180,79,255,0.08) 0%, rgba(0,255,242,0.05) 50%, rgba(255,45,120,0.06) 100%)",
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }} />

      {/* Glitch overlay */}
      <AnimatePresence>
        {glitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: 0, zIndex: 15,
              animation: "heavy-glitch 0.5s steps(1) forwards",
              background: "rgba(180,79,255,0.2)",
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Noise texture overlay */}
      <canvas
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          opacity: 0.04, mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      <ScanlineOverlay />
      <VHSLabel text={`${VIDEOS[videoIdx % VIDEOS.length].label} // VHS`} />
      <TimeCode playing={playing} />

      {/* VHS tracking lines (random horizontal bars) */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 8,
      }}>
        {[15, 45, 72].map((top, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0,
            top: `${top}%`, height: 2,
            background: `rgba(${i === 0 ? "0,255,242" : i === 1 ? "180,79,255" : "255,45,120"}, 0.12)`,
            animation: `vhs-tracking ${2 + i * 0.7}s infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function WaveformDisplay({ playing, color }: WaveformDisplayProps) {
  const bars = 32;
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", gap: 2,
      height: 32, padding: "0 4px",
    }}>
      {Array.from({ length: bars }).map((_, i) => {
        const height = playing
          ? 20 + Math.sin(i * 0.8) * 10 + Math.random() * 8
          : 4;
        return (
          <motion.div
            key={i}
            animate={{ height: playing ? [4, height, height * 0.7, height * 1.1, 4] : 4 }}
            transition={{
              duration: playing ? 0.8 + (i % 4) * 0.2 : 0.3,
              repeat: playing ? Infinity : 0,
              delay: i * 0.03,
              ease: "easeInOut",
            }}
            style={{
              width: 3, background: color, minHeight: 3,
              boxShadow: `0 0 4px ${color}`,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}

function GlitchScreen({ glitching, children }: GlitchScreenProps) {
  return (
    <motion.div
      style={{ position: "relative", width: "100%", height: "100%" }}
      animate={glitching ? {
        x: [0, -6, 8, -4, 6, -2, 0],
        filter: [
          "none",
          "hue-rotate(90deg) saturate(2)",
          "hue-rotate(180deg) saturate(3) brightness(1.5)",
          "hue-rotate(270deg) saturate(1.5)",
          "none",
        ],
      } : {}}
      transition={{ duration: 0.5, times: [0, 0.1, 0.3, 0.6, 1] }}
    >
      {glitching && (
        <>
          <motion.div
            style={{
              position: "absolute", inset: 0, zIndex: 999,
              background: "transparent",
              clipPath: "inset(30% 0 50% 0)",
              backdropFilter: "hue-rotate(180deg)",
              pointerEvents: "none",
              mixBlendMode: "screen",
            }}
            animate={{
              x: [-20, 20, -15, 10, 0],
              opacity: [0.8, 0.6, 0.9, 0.4, 0],
            }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            style={{
              position: "absolute", inset: 0, zIndex: 998,
              background: "rgba(180,79,255,0.1)",
              clipPath: "inset(60% 0 10% 0)",
              pointerEvents: "none",
              mixBlendMode: "screen",
            }}
            animate={{
              x: [15, -20, 10, -5, 0],
              opacity: [0.9, 0.7, 0.8, 0.3, 0],
            }}
            transition={{ duration: 0.5, delay: 0.05 }}
          />
        </>
      )}
      {children}
    </motion.div>
  );
}

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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ZenCanvas() {
  const [trackIdx, setTrackIdx] = useState(0);
  const [videoIdx, setVideoIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [glitching, setGlitching] = useState(false);
  const [reverb, setReverb] = useState(40);
  const [showMixer, setShowMixer] = useState(false);


  const currentTrack = TRACKS[trackIdx];

  const handleNext = useCallback(() => {
    setTrackIdx((i) => (i + 1) % TRACKS.length);
    setVideoIdx((i) => (i + 1) % VIDEOS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setTrackIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);
    setVideoIdx((i) => (i - 1 + VIDEOS.length) % VIDEOS.length);
  }, []);

  const handleGlitch = useCallback(() => {
    if (glitching) return;
    setGlitching(true);
    setTimeout(() => setGlitching(false), 500);
  }, [glitching]);

  return (
    <>
      {/* Root CRT screen */}
      <div
        className="crt-screen"
        style={{
          minHeight: "100vh",
          background: "#0d0d0d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          position: "relative",
        }}
      >
        {/* Ambient purple glow bg */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(180,79,255,0.06) 0%, transparent 70%)",
        }} />

        <GlitchScreen glitching={glitching}>
          {/* Device Frame */}
          <div style={{
            width: "100%", maxWidth: 760,
            background: "#141414",
            border: "1px solid #2a2a2a",
            boxShadow: "0 0 60px rgba(180,79,255,0.2), 0 0 120px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.5)",
            position: "relative", zIndex: 1,
          }}>
            {/* Header Bar */}
            <div style={{
              background: "#0d0d0d",
              borderBottom: "1px solid #2a2a2a",
              padding: "10px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ff2d78", "#ffcc00", "#00ff88"].map((c, i) => (
                    <div key={i} style={{
                      width: 10, height: 10,
                      background: c, borderRadius: "50%",
                      boxShadow: `0 0 6px ${c}`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 20, color: "#b44fff", letterSpacing: 3,
                  textShadow: "0 0 12px rgba(180,79,255,0.8)",
                }}>
                  ZEN_CANVAS
                </span>
                <span className="blink-cursor" style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 14, color: "#555",
                }}>
                  _
                </span>
              </div>

              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11, color: "#555",
                letterSpacing: 1,
              }}>
                TRACK {String(trackIdx + 1).padStart(2, "0")}/{String(TRACKS.length).padStart(2, "0")}
              </div>
            </div>

            {/* Main content area */}
            <div style={{ padding: "16px" }}>
              {/* Video */}
              <VideoContainer
                videoIdx={videoIdx}
                playing={playing}
                glitching={glitching}
              />

              {/* Track info + waveform */}
              <div style={{
                margin: "14px 0 0",
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div className="vhs-text" style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: 15, fontWeight: 700,
                    color: currentTrack.color,
                    letterSpacing: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {currentTrack.title}
                  </div>
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 12, color: "#666", marginTop: 3,
                    letterSpacing: 1,
                  }}>
                    {currentTrack.artist} · {currentTrack.bpm} BPM
                  </div>
                </div>
                <WaveformDisplay playing={playing} color={currentTrack.color} />
              </div>
            </div>

            {/* Now playing ticker */}
            <NowPlayingTicker track={currentTrack} playing={playing} />

            {/* Controls */}
            <div style={{
              background: "#111",
              borderTop: "1px solid #2a2a2a",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}>
              {/* Playback Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PixelButton
                  size="sm"
                  color="#666"
                  onClick={handlePrev}
                  icon="◁◁"
                  label=""
                  disabled={false}
                />
                <PixelButton
                  size="lg"
                  color={playing ? "#ff2d78" : "#00ff88"}
                  onClick={() => setPlaying((p) => !p)}
                  icon={playing ? "||" : "▶"}
                  label=""
                  disabled={false}
                />
                <PixelButton
                  size="sm"
                  color="#666"
                  onClick={handleNext}
                  icon="▷▷"
                  label=""
                  disabled={false}
                />
              </div>

              {/* Center: Track dots */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {TRACKS.map((t, i) => (
                  <motion.button
                    key={t.id}
                    onClick={() => { setTrackIdx(i); setVideoIdx(i % VIDEOS.length); }}
                    whileTap={{ scale: 0.8 }}
                    style={{
                      width: i === trackIdx ? 20 : 8,
                      height: 8,
                      background: i === trackIdx ? t.color : "#2a2a2a",
                      border: "none", cursor: "pointer",
                      boxShadow: i === trackIdx ? `0 0 8px ${t.color}` : "none",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>

            {/* GLITCH Button */}
              <motion.button
                onClick={handleGlitch}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 17, letterSpacing: 2,
                  background: "transparent",
                  border: "2px solid #ff2d78",
                  color: "#ff2d78",
                  padding: "6px 14px",
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(255,45,120,0.4)",
                  textShadow: "0 0 8px rgba(255,45,120,0.8)",
                  position: "relative",
                  overflow: "hidden",
                }}
                animate={glitching ? {
                  boxShadow: ["0 0 12px rgba(255,45,120,0.4)", "0 0 30px rgba(255,45,120,0.9)", "0 0 12px rgba(255,45,120,0.4)"],
                  color: ["#ff2d78", "#fff", "#ff2d78"],
                } : {}}
                transition={{ duration: 0.5 }}
              >
                ⚡ GLITCH
              </motion.button>

              {/* Mixer Toggle Button */}
              <motion.button
                onClick={() => setShowMixer(!showMixer)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                style={{
                  fontFamily: "'VT323', monospace",
                  fontSize: 17, letterSpacing: 2,
                  background: "transparent",
                  border: `2px solid ${showMixer ? "#00fff2" : "#555"}`,
                  color: showMixer ? "#00fff2" : "#999",
                  padding: "6px 14px",
                  cursor: "pointer",
                  boxShadow: showMixer ? "0 0 12px rgba(0,255,242,0.6)" : "none",
                  textShadow: showMixer ? "0 0 8px rgba(0,255,242,0.8)" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                🎚 MIX
              </motion.button>
            </div>

            {/* Mixer Section - Compact inline version */}
            <div style={{
              background: "#0d0d0d",
              borderTop: "1px solid #2a2a2a",
              padding: "8px 20px",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
            }}>
              {/* Compact VU Meter Only */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {["L", "R"].map((ch) => (
                  <div key={ch} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontFamily: "'VT323', monospace", fontSize: 12,
                      color: "#555", width: 12,
                    }}>
                      {ch}
                    </span>
                    <div style={{
                      flex: 1, height: 6, background: "#1a1a1a",
                      border: "1px solid #2a2a2a", overflow: "hidden",
                      display: "flex",
                    }}>
                      {Array.from({ length: 20 }).map((_, i) => {
                        const active = playing && i < Math.floor((volume / 100) * 20 * (0.8 + Math.sin(Date.now() / 200 + i) * 0.2));
                        const color = i < 14 ? "#00ff88" : i < 17 ? "#ffcc00" : "#ff2d78";
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

              {/* Status LEDs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                {[
                  { label: "PWR", color: "#00ff88", on: true },
                  { label: "REC", color: "#ff2d78", on: playing },
                  { label: "VHS", color: "#ffcc00", on: true },
                ].map(({ label, color, on }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div
                      className={on ? "neon-pulse" : ""}
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: on ? color : "#222",
                        boxShadow: on ? `0 0 6px ${color}, 0 0 2px ${color}` : "none",
                        border: `1px solid ${on ? color : "#333"}`,
                      }}
                    />
                    <span style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 8, color: on ? color : "#333",
                    }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: "#0a0a0a",
              borderTop: "1px solid #1a1a1a",
              padding: "8px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10, color: "#333", letterSpacing: 1,
              }}>
                ZEN_CANVAS v1.0.0 // LO-FI SYSTEM
              </span>
              <span style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10, color: "#333", letterSpacing: 1,
              }}>
                © {new Date().getFullYear()} RADNYX_X
              </span>
            </div>
          </div>
        </GlitchScreen>

        {/* Global scanlines over everything */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)",
        }} />

        {/* Mixer Modal */}
        <MixerModal
          isOpen={showMixer}
          volume={volume}
          reverb={reverb}
          onVolumeChange={setVolume}
          onReverbChange={setReverb}
          onClose={() => setShowMixer(false)}
        />
      </div>
    </>
  );
}
