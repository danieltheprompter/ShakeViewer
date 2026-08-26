import { t } from '../lib/i18n.js';

const CHIPS = [
  { range: '24h', key: 'chip_24h' },
  { range: '7d', key: 'chip_7d' },
  { range: '30d', key: 'chip_30d' },
];

export function RangeChips({ range, onChange }) {
  return (
    <div className="sv-querybar-chips" role="group" aria-label="range">
      {CHIPS.map((c) => (
        <button key={c.range} className={`chip ${range === c.range ? 'on' : ''}`} onClick={() => onChange(c.range)}>
          {t(c.key)}
        </button>
      ))}
    </div>
  );
}
