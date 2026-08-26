import { ingestFloor } from '../lib/query.js';
import { isoToLocalDate, localDateToEndIso, localDateToStartIso } from '../lib/time.js';
import { t } from '../lib/i18n.js';

export function CustomStrip({ query, onChange, drawing, onToggleDraw }) {
  const floor = ingestFloor('custom');
  const start = isoToLocalDate(query.start);
  const end = isoToLocalDate(query.end);

  return (
    <div className="sv-custom-strip">
      <label className="sv-custom-field">
        <span className="label">{t('start_date')}</span>
        <input
          className="sv-input"
          type="date"
          value={start}
          max={end || undefined}
          onChange={(e) => onChange({ start: localDateToStartIso(e.target.value) })}
        />
      </label>
      <label className="sv-custom-field">
        <span className="label">{t('end_date')}</span>
        <input
          className="sv-input"
          type="date"
          value={end}
          min={start || undefined}
          onChange={(e) => onChange({ end: localDateToEndIso(e.target.value) })}
        />
      </label>
      <label className="sv-custom-field sv-custom-mag">
        <span className="label">{t('min_magnitude')}</span>
        <div className="sv-custom-mag-row">
          <input
            type="range"
            min={floor}
            max={9}
            step={0.1}
            value={query.minmag}
            aria-label={t('minimum_magnitude')}
            onChange={(e) => onChange({ minmag: Number(e.target.value) })}
          />
          <span className="mono control">M{Number(query.minmag).toFixed(1)}+</span>
        </div>
      </label>
      <button
        type="button"
        className={`sv-text-btn${drawing ? ' on' : ''}`}
        aria-pressed={!!drawing}
        onClick={onToggleDraw}
      >
        {t('draw_area')}
      </button>
    </div>
  );
}
