export function TweaksPanel({ tweaks, onChange }) {
  const row = (label, options, value, onPick, labels = {}) => (
    <div style={{ marginBottom: 12 }}>
      <div className="label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="seg" style={{ width: '100%' }}>
        {options.map((v) => (
          <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onPick(v)}
            style={{ flex: 1, textTransform: 'capitalize' }}>{labels[v] || v}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="sv-tweaks">
      <div className="sv-tweaks-header">
        <span className="display" style={{ fontSize: 17 }}>Tweaks</span>
        <span className="label">ShakeViewer</span>
      </div>
      {row('Accent', ['cyan', 'emerald'], tweaks.accent, (v) => onChange('accent', v))}
      {row('Typography', ['serif', 'sans'], tweaks.type_pair, (v) => onChange('type_pair', v), { serif: 'Serif + Inter', sans: 'All Inter' })}
      {row('List density', ['comfortable', 'compact'], tweaks.density, (v) => onChange('density', v))}
      {row('Sheet start', ['peek', 'half', 'full'], tweaks.sheet_initial, (v) => onChange('sheet_initial', v))}
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 10, lineHeight: 1.5 }}>
        Toggle Tweaks off (toolbar) to see the finished design.
      </div>
    </div>
  );
}
