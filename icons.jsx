/* Inline SVG icon set — lightweight, no external JS */

const ICONS = {
  'menu':        'M4 6h16M4 12h16M4 18h16',
  'close':       'M6 6l12 12M18 6L6 18',
  'search':      'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  'filter':      'M4 5h16M7 12h10M10 19h4',
  'list':        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  'map':         'M9 3l-6 2v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16',
  'bookmark':    'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
  'bookmark-filled':'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16zZ',
  'link':        'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  'user':        'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  'sun':         'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  'moon':        'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  'crosshair':   'M12 2v4M12 18v4M2 12h4M18 12h4',
  'chevron-down':'M6 9l6 6 6-6',
  'chevron-up':  'M18 15l-6-6-6 6',
  'chevron-right':'M9 18l6-6-6-6',
  'chevron-left':'M15 18l-6-6 6-6',
  'arrow-down':  'M12 5v14M19 12l-7 7-7-7',
  'arrow-up':    'M12 19V5M5 12l7-7 7 7',
  'globe':       'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20',
  'zap':         'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  'alert':       'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  'pin':         'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 13a3 3 0 100-6 3 3 0 000 6z',
  'info':        'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  'settings':    'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  'share':       'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  'x-circle':    'M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6',
  'check':       'M20 6L9 17l-5-5',
  'pencil':      'M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  'history':     'M3 3v5h5M3.05 13A9 9 0 106 5.3L3 8M12 7v5l4 2',
  'calendar':    'M3 4h18v18H3zM3 10h18M8 2v4M16 2v4',
  'trash':       'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
  'refresh':     'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  'plus':        'M12 5v14M5 12h14',
  'minus':       'M5 12h14',
  'layers':      'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  'grip':        'M5 6h.01M12 6h.01M19 6h.01M5 12h.01M12 12h.01M19 12h.01M5 18h.01M12 18h.01M19 18h.01',
};

const SvIcon = ({ name, size = 16, strokeWidth = 1.75, style, className = '' }) => {
  const d = ICONS[name];
  if (!d) return null;
  const isFilled = name.endsWith('-filled');
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: isFilled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    className: `sv-icon ${className}`,
    style: { flexShrink: 0, ...style },
    'aria-hidden': 'true'
  }, React.createElement('path', { d }));
};

window.SvIcon = SvIcon;
