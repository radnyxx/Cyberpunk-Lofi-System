# 📼 ZEN CANVAS

> **Lo-Fi beats with VHS Cyberpunk aesthetics.**  
> A tactile, retro-futuristic music player built with React, TypeScript, and Framer Motion.

---

![ZEN CANVAS Preview](https://img.shields.io/badge/STATUS-ONLINE-00ff88?style=for-the-badge&labelColor=0d0d0d&color=b44fff)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0d0d0d)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0d0d0d)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-FF0055?style=for-the-badge&logo=framer&logoColor=white&labelColor=0d0d0d)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=0d0d0d)

---

## ✦ Features

| Feature | Description |
|---|---|
| **VHS Tracking Effect** | Persistent scanline overlay, RGB color shift, and horizontal glitch artifacts |
| **CRT Flicker** | Full-screen CRT phosphor flicker animation at the root level |
| **Pixel Controls** | 1-bit styled Play, Pause, Prev, Next buttons with neon glow |
| **Framer Motion** | Press-down haptic feel + glitch-shake on hover for all buttons |
| **Now Playing Ticker** | Scrolling terminal-style monospaced ticker with artist/track/BPM |
| **VHS Fader Mixer** | Vertical vintage-style fader controls for Volume and Reverb |
| **VU Meter** | Animated L/R level meters with green → yellow → red segments |
| **Status LEDs** | PWR / REC / VHS indicator LEDs with neon pulse animation |
| **⚡ GLITCH Button** | 500ms full-screen visual distortion with RGB channel splitting |
| **Looping Video Backgrounds** | Atmospheric video scenes cycling per track |
| **Waveform Visualizer** | Animated frequency bar display synced to playback state |
| **Fully Responsive** | Adapts from mobile to widescreen with tactile device framing |
| **TypeScript Strict** | Complete type coverage across all components and state |

---

## ◈ Tech Stack

- **React 18** — UI composition
- **TypeScript 5** — Strict type safety across all state and props
- **Framer Motion 11** — Button animations, glitch layers, waveform motion
- **Vite 5** — Lightning-fast dev server and build
- **CSS Animations** — CRT flicker, scanline scroll, VHS tracking, neon pulse, RGB text shift

---

## ◈ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **pnpm**

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/zen-canvas.git
cd zen-canvas

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## ◈ Project Structure

```
zen-canvas/
├── src/
│   ├── App.tsx          # Main application — all components
│   ├── types.ts         # TypeScript interfaces and types
│   ├── constants.ts     # Playlist data, video scenes, config
│   └── main.tsx         # React root entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## ◈ Connecting Real Audio

To connect real lo-fi tracks, update `src/constants.ts`:

```typescript
export const TRACKS: readonly Track[] = [
  {
    id: 1,
    title: 'your-track.mp3',
    artist: 'ARTIST_NAME',
    bpm: 72,
    color: '#b44fff',
    // Add an `audioSrc` field and wire it to an <audio> element in VideoContainer
  },
];
```

For real video backgrounds, update the `src` field in `VIDEOS` with publicly accessible `.mp4` URLs or local `/public` assets.

---

## ◈ Customization

### Adding Tracks

Edit `src/constants.ts` — add entries to the `TRACKS` array. Each track supports:
- `title` — filename-style display string
- `artist` — artist handle
- `bpm` — beats per minute shown in the ticker
- `color` — hex accent color for this track (neon glow, waveform, dots)

### Changing Video Scenes

Edit the `VIDEOS` array in `src/constants.ts`:
```typescript
{ id: 3, label: 'CYBER RAIN', src: '/videos/cyber-rain.mp4' }
```

Place video files in the `/public/videos/` directory.

### Adjusting Glitch Duration

```typescript
// src/constants.ts
export const GLITCH_DURATION_MS = 500; // milliseconds
```

---

## ◈ Aesthetic Design Decisions

- **`#0d0d0d`** — Root background (near-black, not pure black)
- **`#b44fff`** — Primary neon purple (all main accents)
- **`#00fff2`** — Secondary cyan (fader, VU meter)  
- **`#ff2d78`** — Alert pink (REC light, Glitch button, peak meter)
- **`Share Tech Mono`** — Body terminal font
- **`VT323`** — Pixel-art control labels
- **`Orbitron`** — Track title display font

---

## ◈ License

MIT — free to fork, remix, and broadcast into the void.

---

<div align="center">
  <code>ZEN_CANVAS v1.0.0 // LO-FI SYSTEM</code><br/>
  <code>© 2025 GHOST_PROTOCOL_MEDIA</code>
</div>
