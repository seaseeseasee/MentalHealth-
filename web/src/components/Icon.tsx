const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  tests: 'M8 3h8v3H8zM6 4.5H5v16.5h14V4.5h-1M9 11h6M9 15h4',
  history: 'M4 19h16M6 15l4-5 4 3 5-7',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  user: 'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l4 4 10-10',
  clock: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7v5l3 2',
  info: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 11v6M12 7.5v.5',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z',
  shield: 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  flame: 'M12 21c-4 0-6-3-6-6 0-4 4-6 4-10 3 2 4 4 4 6 1-1 2-2 2-3 2 2 2 4 2 7 0 3-2 6-6 6z',
  smile: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM8.5 14.5q3.5 3 7 0M9 9.5v.5M15 9.5v.5',
  wave: 'M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0',
  cloud: 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 18z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  sprout: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-4 3-6 7-6 0 4-3 6-7 6z',
  glass: 'M7 3h10l-1 8a4 4 0 0 1-8 0zM12 15v6M8 21h8',
  game: 'M8 8h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 8zM8 11v4M6 13h4M16 12v.01M18 14v.01',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  battery: 'M5 8h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM21 11v3M6 11v3',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  walk: 'M13 4a1.5 1.5 0 1 0 0 .1M9 20l3-6 3 2v5M7 12l3-3 4 1 3 3',
  chat: 'M4 5h16v10H9l-5 4z',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8',
  body: 'M12 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM6 21v-5a6 6 0 0 1 12 0v5',
  rain: 'M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 15zM8 19l-1 2M12 19l-1 2M16 19l-1 2',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  play: 'M8 5l11 7-11 7z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  globe: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5c-.8.8-1 1.5-1 2.5H9c0-1-.2-1.7-1-2.5A6 6 0 0 1 12 3z',
  search: 'M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM20 20l-4-4',
  filter: 'M4 6h16M7 12h10M10 18h4',
  printer: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  users: 'M9 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8zM2 21c1-4 4-6 7-6s6 2 7 6M17 4.5a3.5 3.5 0 0 1 0 7M19 15c2 .8 3 2.8 3.5 5',
  settings: 'M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  file: 'M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h6',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'
};

const FILLED = new Set(['play', 'pause']);

export function Icon({ name, size = 20, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
