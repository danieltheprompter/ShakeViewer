/* Earthquake detail view — shown inline in panel / sheet when selected */

const QuakeDetail = ({ quake, onClose, onBookmark, onShare, bookmarked }) => {
  if (!quake) return null;
  const { mag, place, time, felt, url } = quake.properties;
  const [lng, lat, depth] = quake.geometry.coordinates;
  const color = window.getMagnitudeHex(mag);
  const label = window.getMagnitudeLabel(mag);
  const depthCategory = depth < 70 ? 'Shallow' : depth < 300 ? 'Intermediate' : 'Deep';

  return React.createElement('div', { className: 'quake-detail sv-enter' },
    React.createElement('div', { className: 'qd-header' },
      React.createElement('button', {
        className: 'sv-btn', onClick: onClose, style: { padding: 6 }, 'aria-label': 'Back'
      }, React.createElement(SvIcon, { name: 'chevron-left', size: 18 }),
         React.createElement('span', { style: { fontSize: 13 }}, 'Back')
      ),
      React.createElement('div', { style: { display:'flex', gap: 4 } },
        React.createElement('button', {
          className: 'sv-btn', onClick: () => onBookmark(quake),
          style: { color: bookmarked ? 'var(--accent)' : 'var(--fg-2)', padding: 8 },
          'aria-label': 'Bookmark'
        }, React.createElement(SvIcon, { name: bookmarked ? 'bookmark-filled' : 'bookmark', size: 16 })),
        React.createElement('button', {
          className: 'sv-btn', onClick: () => onShare(quake), style: { padding: 8 }, 'aria-label':'Share'
        }, React.createElement(SvIcon, { name: 'link', size: 16 }))
      )
    ),

    React.createElement('div', { className: 'qd-hero' },
      React.createElement('div', { className: 'qd-mag-stamp', style: { background: color } },
        React.createElement('span', { className: 'display', style: { fontSize: 64, lineHeight: 0.9, color:'#0a0d12' } },
          mag.toFixed(1)
        )
      ),
      React.createElement('div', { className: 'qd-meta' },
        React.createElement('div', { className: 'label', style:{ color } }, `${label} · M ${mag.toFixed(1)}`),
        React.createElement('h2', {
          className: 'display',
          style: { fontSize: 28, margin: '6px 0 12px', lineHeight: 1.15, color: 'var(--fg-0)' }
        }, place || 'Unknown region'),
        React.createElement('div', { style:{ display:'flex', gap: 8, flexWrap:'wrap' } },
          React.createElement('span', { className: 'chip' },
            React.createElement(SvIcon, { name:'history', size: 11 }),
            window.formatAbsTime(time) + ' · ' + window.formatRelTime(time)
          ),
          React.createElement('span', { className: 'chip' }, quake.source || 'USGS'),
          quake.properties.tsunami && React.createElement('span', {
            className: 'chip', style:{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor:'rgba(239,68,68,0.35)' }
          }, 'Tsunami watch')
        )
      )
    ),

    React.createElement('div', { className: 'qd-grid' },
      statCell('Depth', `${Math.abs(depth).toFixed(1)} km`, depthCategory),
      statCell('Latitude', `${Math.abs(lat).toFixed(3)}°${lat>=0?'N':'S'}`, null),
      statCell('Longitude', `${Math.abs(lng).toFixed(3)}°${lng>=0?'E':'W'}`, null),
      statCell('Felt reports', felt > 0 ? (felt > 1000 ? (felt/1000).toFixed(1)+'k' : String(felt)) : '—',
               felt > 0 ? 'people reported' : null),
    ),

    React.createElement('div', { style: { padding: '0 24px 24px' } },
      url && React.createElement('a', {
        href: url, target:'_blank', rel:'noopener noreferrer',
        className: 'sv-btn ghost',
        style: { marginTop: 8, width:'100%', justifyContent:'center' }
      },
        React.createElement(SvIcon, { name:'link', size: 14 }),
        `Full report on ${quake.source || 'USGS'}`
      )
    )
  );
};

const statCell = (label, value, sub) => React.createElement('div', { className: 'stat-cell', key: label },
  React.createElement('div', { className: 'label', style:{ fontSize: 9.5 } }, label),
  React.createElement('div', { className: 'mono', style:{ fontSize: 20, color: 'var(--fg-0)', marginTop: 4, letterSpacing: '-0.01em' } }, value),
  sub && React.createElement('div', { style:{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 } }, sub)
);

window.QuakeDetail = QuakeDetail;
