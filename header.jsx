/* Top header — slim, editorial, floats over map on mobile */

const SvHeader = ({ timeRange, onTimeRange, onOpenAuth, onToggleTheme, isDark, stats, onOpenMenu, onOpenFilters, isMobile }) => {
  const timeLabels = { day: '24 h', week: '7 d', month: '30 d', custom: 'Custom' };

  if (isMobile) {
    return React.createElement('header', { className: 'sv-header mobile' },
      React.createElement('div', { className: 'sv-header-row' },
        React.createElement('button', {
          className: 'sv-btn', onClick: onOpenMenu, 'aria-label': 'Menu',
          style: { padding: 8 }
        }, React.createElement(SvIcon, { name: 'menu', size: 18 })),
        React.createElement('div', { className: 'sv-brand' },
          React.createElement(SvLogo, { size: 22 }),
          React.createElement('span', { className: 'display', style: { fontSize: 19, letterSpacing: '-0.01em' } }, 'ShakeViewer')
        ),
        React.createElement('button', {
          className: 'sv-btn', onClick: onOpenFilters, 'aria-label': 'Filters',
          style: { padding: 8 }
        }, React.createElement(SvIcon, { name: 'filter', size: 18 })),
      )
    );
  }

  // Desktop
  return React.createElement('header', { className: 'sv-header desktop' },
    React.createElement('div', { className: 'sv-brand' },
      React.createElement(SvLogo, { size: 24 }),
      React.createElement('span', { className: 'display', style: { fontSize: 22, letterSpacing: '-0.01em', whiteSpace: 'nowrap' } }, 'ShakeViewer'),
      React.createElement('span', { className: 'label sv-tagline', style: { marginLeft: 6, color: 'var(--fg-3)', whiteSpace: 'nowrap' } }, 'Global Seismic Monitor')
    ),
    React.createElement('div', { className: 'sv-header-right' },
      React.createElement('div', { className: 'seg' },
        ['day','week','month','custom'].map(v =>
          React.createElement('button', {
            key: v,
            className: timeRange === v ? 'on' : '',
            onClick: () => onTimeRange(v)
          }, timeLabels[v])
        )
      ),
      React.createElement('button', {
        className: 'sv-btn',
        onClick: onToggleTheme,
        title: isDark ? 'Light mode' : 'Dark mode',
        style: { padding: 8 }
      }, React.createElement(SvIcon, { name: isDark ? 'sun' : 'moon', size: 17 })),
      React.createElement('button', {
        className: 'sv-btn ghost',
        onClick: onOpenAuth
      },
        React.createElement(SvIcon, { name: 'user', size: 14 }),
        'Sign in'
      )
    )
  );
};

// Simple logo — echoes the seismograph motif but modernized
const SvLogo = ({ size = 24 }) => React.createElement('svg', {
  width: size, height: size, viewBox: '0 0 32 32', fill: 'none', 'aria-hidden': 'true'
},
  React.createElement('circle', { cx: 16, cy: 16, r: 14, stroke: 'var(--accent)', strokeWidth: 1, opacity: 0.35 }),
  React.createElement('circle', { cx: 16, cy: 16, r: 9, stroke: 'var(--accent)', strokeWidth: 1, opacity: 0.5 }),
  React.createElement('path', {
    d: 'M3 16 L9 16 L11 10 L13 22 L15 13 L17 19 L19 8 L21 24 L23 14 L25 16 L29 16',
    stroke: 'var(--accent)', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none'
  }),
  React.createElement('circle', { cx: 16, cy: 16, r: 2, fill: 'var(--accent)' })
);

window.SvHeader = SvHeader;
window.SvLogo = SvLogo;
