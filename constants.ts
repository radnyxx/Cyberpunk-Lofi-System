import type { Track, VideoScene } from './types';

export const TRACKS: readonly Track[] = [
  { id: 1, title: "spirit.mp3", artist: "CITY_GHOST", bpm: 72, color: "#b44fff", audioSrc: "/audio/spirit.mp3" },
  { id: 2, title: "player.mp3", artist: "VAPORWAVE_UNIT", bpm: 68, color: "#00fff2", audioSrc: "/audio/player.mp3" },
  { id: 3, title: "chill.mp3", artist: "SYNTH_ROID", bpm: 80, color: "#ff2d78", audioSrc: "/audio/chill.mp3" },
  { id: 4, title: "hiphop.mp3", artist: "NULL_POINTER", bpm: 64, color: "#ffcc00", audioSrc: "/audio/hiphop.mp3" },
  { id: 5, title: "lofi.mp3", artist: "RETRO_DEMON", bpm: 76, color: "#00ff88", audioSrc: "/audio/lofi.mp3" },
] as const;

export const VIDEOS: readonly VideoScene[] = [
  {
    id: 1,
    label: 'RAINY WINDOW',
    src: 'https://v1.pinimg.com/videos/iht/expMp4/3e/33/08/3e3308752ea0d513e394d8912f8e7ff5_720w.mp4',
  },
  {
    id: 2,
    label: 'PIXEL KITTY',
    src: 'https://v1.pinimg.com/videos/iht/expMp4/58/05/c9/5805c9aeb55a919fed06775e3589cd7a_720w.mp4',
  },
  {
    id: 3,
    label: 'NEON NIGHT',
    src: 'https://v1.pinimg.com/videos/iht/expMp4/61/42/e2/6142e2db23a0aa424af552b1b00ffa62_720w.mp4',
  },
  {
    id: 4,
    label: 'FUTURAMA',
    src: 'https://v1.pinimg.com/videos/iht/720p/6a/23/9a/6a239a716f38f2099b656f07a7469edd.mp4',
  },
  {
    id: 5,
    label: 'CYBERPUNK CITY',
    src: 'https://v1.pinimg.com/videos/mc/720p/c5/01/7d/c5017db22b5cffb58afc464fef1578ff.mp4',
  }
] as const;

export const GLITCH_DURATION_MS = 500;

export const VU_SEGMENT_COUNT = 20;
export const VU_GREEN_THRESHOLD = 14;
export const VU_YELLOW_THRESHOLD = 17;
