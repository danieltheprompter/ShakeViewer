/* Tweaks floating panel */

const TweaksPanel = ({ tweaks, onChange }) => {
  return React.createElement('div', { className: 'sv-tweaks' },
    React.createElement('div', { className: 'sv-tweaks-header' },
      React.createElement('span', { className: 'display', style: { fontSize: 17 } }, 'Tweaks'),
      React.createElement('span', { className: 'label' }, 'ShakeViewer')
    ),

    row('Accent', ['cyan','emerald'], tweaks.accent, v => onChange('accent', v)),
    row('Typography', ['serif','sans'], tweaks.type_pair, v => onChange('type_pair', v),
      { serif: 'Serif + Inter', sans: 'All Inter' }),
    row('List density', ['comfortable','compact'], tweaks.density, v => onChange('density', v)),
    row('Sheet start', ['peek','half','full'], tweaks.sheet_initial, v => onChange('sheet_initial', v)),

    React.createElement('div', { style: { fontSize: 11, color: 'var(--fg-3)', marginTop: 10, lineHeight: 1.5 } },
      'Toggle Tweaks off (toolbar) to see the finished design.')
  );
};

const row = (label, options, value, onPick, labels = {}) => React.createElement('div', {
  key: label,
  style: { marginBottom: 12 }
},
  React.createElement('div', { className: 'label', style: { marginBottom: 6 } }, label),
  React.createElement('div', { className: 'seg', style: { width: '100%' } },
    options.map(v => React.createElement('button', {
      key: v, className: value === v ? 'on' : '', onClick: () => onPick(v),
      style: { flex: 1, textTransform: 'capitalize' }
    }, labels[v] || v))
  )
);

window.TweaksPanel = TweaksPanel;
