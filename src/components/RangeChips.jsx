import { getLang, t } from '../lib/i18n.js';
import { customChipLabel } from '../lib/query.js';

const PRESETS = [
  { range: '24h', key: 'chip_24h' },
  { range: '7d', key: 'chip_7d' },
  { range: '30d', key: 'chip_30d' },
];

export function RangeChips({ range, query, onChange }) {
  const customOn = range === 'custom';
  const customText = customOn
    ? customChipLabel(query, getLang(), t('chip_area'))
    : t('chip_custom');

  return (
    <div className="sv-querybar-chips" role="group" aria-label="range">
      {PRESETS.map((c) => (
        <button
          key={c.range}
          type="button"
          className={`chip ${range === c.range ? 'on' : ''}`}
          onClick={() => { if (range !== c.range) onChange(c.range); }}
        >
          {t(c.key)}
        </button>
      ))}
      <button
        type="button"
        className={`chip ${customOn ? 'on' : ''}`}
        onClick={() => { if (!customOn) onChange('custom'); }}
      >
        {customText}
      </button>
    </div>
  );
}
