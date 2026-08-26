/* List + row — shared between desktop panel and mobile sheet */

const QuakeRow = ({ quake, selected, onClick, onBookmark, onShare, bookmarked }) => {
  const { mag, place, time, felt } = quake.properties;
  const [lng, lat, depth] = quake.geometry.coordinates;
  const color = window.getMagnitudeHex(mag);
  return React.createElement('div', {
    className: `row ${selected ? 'selected' : ''}`,
    onClick: () => onClick(quake),
    role: 'button', tabIndex: 0,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(quake); } }
  },
    React.createElement('div', {
      className: 'mag',
      style: { background: color, color: '#0a0d12' }
    }, mag.toFixed(1)),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'baseline', gap: 8, marginBottom: 2 } },
        React.createElement('div', {
          style: {
            fontSize: 15, fontWeight: 500, color: 'var(--fg-0)',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex: 1, minWidth: 0
          }
        }, place || 'Unknown region'),
        React.createElement('span', {
          className: 'mono', style: { fontSize: 11, color: 'var(--fg-2)', flexShrink: 0 }
        }, window.formatRelTime(time))
      ),
      React.createElement('div', { style: { display:'flex', alignItems:'center', gap: 14, fontSize: 12, color: 'var(--fg-2)' } },
        React.createElement('span', { className:'mono' },
          `${Math.abs(depth).toFixed(1)} km`
        ),
        React.createElement('span', { className:'mono', style:{ letterSpacing: '0.02em' } },
          window.formatCoord(lat, lng)
        ),
        felt > 0 && React.createElement('span', { style:{ color: 'var(--fg-1)' } },
          `${felt > 1000 ? (felt/1000).toFixed(1)+'k' : felt} felt`
        )
      )
    ),
    React.createElement('div', {
      className: 'row-actions',
      style: { display:'flex', gap: 4, alignItems:'center', opacity: 0.6 },
      onClick: (e) => e.stopPropagation()
    },
      onBookmark && React.createElement('button', {
        className: 'sv-btn',
        style: { padding: '6px', minHeight: 'auto', color: bookmarked ? 'var(--accent)' : 'var(--fg-2)' },
        onClick: () => onBookmark(quake),
        'aria-label': 'Bookmark',
        title: 'Bookmark'
      }, React.createElement(SvIcon, { name: bookmarked ? 'bookmark-filled' : 'bookmark', size: 15 })),
      onShare && React.createElement('button', {
        className: 'sv-btn',
        style: { padding: '6px', minHeight: 'auto', color: 'var(--fg-2)' },
        onClick: () => onShare(quake),
        'aria-label': 'Share',
        title: 'Copy link'
      }, React.createElement(SvIcon, { name: 'link', size: 15 }))
    )
  );
};

const QuakeList = ({ quakes, selectedId, onSelect, bookmarks, onBookmark, onShare, emptyMsg }) => {
  if (!quakes.length) {
    return React.createElement('div', {
      style: { padding: '48px 20px', textAlign: 'center', color: 'var(--fg-2)', fontSize: 13 }
    }, emptyMsg || 'No earthquakes match your filters.');
  }
  return React.createElement('div', { className: 'sv-list' },
    quakes.map(q => React.createElement(QuakeRow, {
      key: q.id, quake: q,
      selected: q.id === selectedId,
      onClick: onSelect,
      onBookmark,
      onShare,
      bookmarked: bookmarks && bookmarks.has(q.id),
    }))
  );
};

window.QuakeRow = QuakeRow;
window.QuakeList = QuakeList;
