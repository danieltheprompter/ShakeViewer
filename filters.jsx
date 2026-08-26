/* Filter panel — used inside desktop panel and mobile sheet */

const FilterPanel = ({
  depthFilter, onDepthFilter,
  minMag, onMinMag,
  showPlates, onShowPlates,
  nearMeActive, onNearMeActive,
  sortType, sortDirection, onToggleSort,
  mapStyle, onMapStyle,
  compact = false,
}) => {
  const field = (label, children) => React.createElement('div', { className: 'sv-field' },
    React.createElement('div', { className: 'label', style: { marginBottom: 6 } }, label),
    children
  );

  return React.createElement('div', { className: 'sv-filters', style: { padding: compact ? '12px 20px 20px' : '16px 20px 24px' } },
    field('Minimum magnitude',
      React.createElement('div', null,
        React.createElement('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 2 } },
          React.createElement('span', { className: 'mono', style: { fontSize: 13, color: 'var(--fg-1)', whiteSpace: 'nowrap' } }, `M ${Number(minMag).toFixed(1)}+`),
          React.createElement('span', { style: { fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' } }, '2.5 – 9.0')
        ),
        React.createElement('input', {
          type: 'range', min: 2.5, max: 9.0, step: 0.1,
          value: minMag,
          onChange: (e) => onMinMag(parseFloat(e.target.value)),
          'aria-label': 'Minimum magnitude'
        })
      )
    ),
    field('Depth',
      React.createElement('div', { className: 'seg', style: { width: '100%' } },
        [
          ['all','All'],['shallow','<70 km'],['intermediate','70–300'],['deep','>300']
        ].map(([v, lbl]) => React.createElement('button', {
          key: v, className: depthFilter === v ? 'on' : '', onClick: () => onDepthFilter(v),
          style: { flex: 1 }
        }, lbl))
      )
    ),
    field('Sort by',
      React.createElement('div', { className: 'seg', style: { width: '100%' } },
        ['time', 'mag'].map(v => React.createElement('button', {
          key: v,
          className: sortType === v ? 'on' : '',
          onClick: () => onToggleSort(v),
          style: { flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap: 4 }
        },
          v === 'time' ? 'Time' : 'Magnitude',
          sortType === v && React.createElement(SvIcon, { name: sortDirection === 'desc' ? 'arrow-down' : 'arrow-up', size: 12 })
        ))
      )
    ),
    field('Map',
      React.createElement('div', { className: 'seg', style: { width: '100%' } },
        ['dark','light','satellite'].map(v => React.createElement('button', {
          key: v, className: mapStyle === v ? 'on' : '', onClick: () => onMapStyle(v), style: { flex: 1, textTransform:'capitalize' }
        }, v))
      )
    ),
    React.createElement('div', { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 } },
      React.createElement(ToggleRow, {
        label: 'Plate boundaries',
        sub: 'Overlay tectonic plates',
        on: showPlates, onChange: onShowPlates
      }),
      React.createElement(ToggleRow, {
        label: 'Near me',
        sub: 'Show quakes within 500 km',
        on: nearMeActive, onChange: onNearMeActive
      })
    )
  );
};

const ToggleRow = ({ label, sub, on, onChange }) => React.createElement('button', {
  className: 'sv-toggle-row',
  onClick: () => onChange(!on),
  style: {
    display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '10px 0', background: 'transparent', textAlign: 'left',
    borderTop: '1px solid var(--line)',
    minHeight: 48,
  }
},
  React.createElement('div', null,
    React.createElement('div', { style: { fontSize: 13, color: 'var(--fg-0)', fontWeight: 500 } }, label),
    sub && React.createElement('div', { style: { fontSize: 11, color: 'var(--fg-3)', marginTop: 1 } }, sub)
  ),
  React.createElement('div', {
    style: {
      width: 34, height: 20, borderRadius: 999,
      background: on ? 'var(--accent)' : 'var(--bg-3)',
      position: 'relative',
      transition: 'background 0.15s',
      flexShrink: 0,
    }
  },
    React.createElement('div', {
      style: {
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#0a0d12' : 'var(--fg-1)',
        transition: 'left 0.18s cubic-bezier(.4,.0,.2,1)',
      }
    })
  )
);

window.FilterPanel = FilterPanel;
window.ToggleRow = ToggleRow;
