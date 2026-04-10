// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Track {
  readonly id: number;
  readonly title: string;
  readonly artist: string;
  readonly bpm: number;
  readonly color: string;
  readonly audioSrc: string;
  readonly duration?: number; // seconds
}

export interface VideoScene {
  readonly id: number;
  readonly label: string;
  readonly src: string;
  readonly poster?: string;
}

// ─── State Types ──────────────────────────────────────────────────────────────

export type PlaybackStatus = 'playing' | 'paused' | 'stopped';

export interface PlayerState {
  trackIdx: number;
  videoIdx: number;
  playing: boolean;
  volume: 100;       // 100
  reverb: number;       // 0–100
  glitching: boolean;
}

export interface TimeCode {
  h: string;
  m: string;
  s: string;
  f: string; // frame
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface PixelButtonProps {
  label?: string;
  icon?: string;
  onClick?: () => void;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export interface VHSFaderProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  color?: string;
}

export interface NowPlayingTickerProps {
  track: Track;
  playing: boolean;
}

export interface VideoContainerProps {
  videoIdx: number;
  playing: boolean;
  glitching: boolean;
}

export interface WaveformDisplayProps {
  playing: boolean;
  color: string;
}
