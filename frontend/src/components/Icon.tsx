import type { CSSProperties } from 'react';

const paths = {
  robot: 'M8 4h8l3 5v9l-4 3H9l-4-3V9l3-5ZM9 12h.01M15 12h.01M9 16h6M12 1v3M2 11h3M19 11h3',
  control: 'M8 7h8a4 4 0 0 1 4 3l2 7a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l2-7a4 4 0 0 1 4-3ZM8 10v4M6 12h4M16 11h.01M18 13h.01',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12l3-3',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  route: 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 6h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h7',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  up: 'M12 19V5m-6 6 6-6 6 6',
  down: 'M12 5v14m-6-6 6 6 6-6',
  left: 'M19 12H5m6-6-6 6 6 6',
  rotateLeft: 'M3 11a9 9 0 1 1 3 8M3 4v7h7',
  rotateRight: 'M21 11a9 9 0 1 0-3 8M21 4v7h-7',
  stop: 'M6 6h12v12H6z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3ZM8 12l3 3 5-6',
  offline: 'M2 2l20 20M8 8a7 7 0 0 0-3 4M2 8a15 15 0 0 1 3-3M9 3a15 15 0 0 1 13 5M12 7a10 10 0 0 1 7 5M8 16a6 6 0 0 1 8 0M12 20h.01',
  keyboard: 'M3 5h18v14H3V5ZM7 9h.01M11 9h.01M15 9h.01M18 9h.01M7 13h.01M11 13h.01M15 13h.01M7 16h10',
  layers: 'm12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 12h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  refresh: 'M20 7a9 9 0 1 0 1 9M20 3v5h-5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  edit: 'm4 16-1 5 5-1L21 7l-5-5L4 16ZM13 5l5 5',
  save: 'M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7h.01',
  activity: 'M2 12h4l3-8 6 16 3-8h4',
  expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true"><path d={paths[name]} /></svg>;
}
