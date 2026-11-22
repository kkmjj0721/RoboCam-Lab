const shapes = {
  brand: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M8 6l1.6-2h4.8L16 6"/><circle cx="12" cy="12.5" r="3.3"/><path d="M17.5 9h.01"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12m-4-4 4 4 4-4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  link: '<path d="M10 13.5 14 9.5m-5.5 5.7-1.3 1.3a3.2 3.2 0 0 1-4.5-4.5l4.2-4.2a3.2 3.2 0 0 1 4.5 0m4.1 1 1.3-1.3a3.2 3.2 0 0 1 4.5 4.5l-4.2 4.2a3.2 3.2 0 0 1-4.5 0" transform="translate(0 1)"/>',
  reset: '<path d="M4 11a8 8 0 1 1 1.8 6.1M4 4v7h7"/>',
  sliders: '<path d="M4 7h5m4 0h7M4 17h10m4 0h2"/><circle cx="11" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5m8 4.5v9"/>',
  view: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-7 0v9"/>',
  orbit: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-35 12 12)"/><path d="M5 7c2-3 8-2 12 1s5 7 2 9"/>',
  move: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-9 3-3 3 3 3m3 3 3 3 3-3m3-9 3 3-3 3"/>',
  robot: '<path d="M4 10h13l3-3v7h-3m-12 0-2 4m6-4 1 4m5-4-2 4m4-4 2 4"/><rect x="5" y="9" width="12" height="5" rx="1.5"/>',
  rotate: '<path d="M20 10a8 8 0 1 0-2 7m2-13v6h-6"/>',
  fit: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="2"/>',
  frustum: '<path d="M4 10 19 4v16L4 14v-4Zm15-6-5 3v10l5 3M4 10v4"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  flat: '<path d="M3 16h18m-15-5h12M9 6h6"/>',
  stairs: '<path d="M3 19h5v-5h5V9h5V4h3"/>',
  stones: '<path d="M3.5 16h4v4h-4zm6-6h4v4h-4zm6-6h4v4h-4zm0 12h4v4h-4z"/>',
  platform: '<path d="M3 19h18M6 19V8h12v11M6 13h12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
} as const;

export function icon(name: keyof typeof shapes, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;
}
