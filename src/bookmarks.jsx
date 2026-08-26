import { Dialog } from './dialog.jsx';
import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';
import { getMagnitudeHex } from './data.js';
import { formatAbsTime } from './list.jsx';

export function BookmarksPanel({ bookmarks, onRemove, onSelect, onClose }) {
  return (
    <Dialog onClose={onClose} titleId="bm-title" wider className="bookmarks-dialog">
      <div className="modal-head">
        <h3 id="bm-title" className="display" style={{ fontSize: 22, margin: 0 }}>{t('bookmarks_title', { n: bookmarks.length })}</h3>
        <button type="button" className="sv-btn" onClick={onClose} style={{ padding: 8 }} aria-label={t('close')}><SvIcon name="close" size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {bookmarks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>{t('no_bookmarks_yet')}</div>
        ) : bookmarks.map((b) => (
          <div key={b.id} className="row" style={{ cursor: 'default' }}>
            <div className="mag" style={{ background: getMagnitudeHex(b.mag) }}>{Number(b.mag || 0).toFixed(1)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: 'var(--fg-0)', fontWeight: 500 }}>{b.place}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {formatAbsTime(b.time)} · {Number(Math.abs(b.depth || 0)).toFixed(1)} km
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {b.quakeId && onSelect && (
                <button type="button" className="sv-btn" onClick={() => onSelect(b.quakeId)} style={{ padding: 6 }} aria-label={t('more_details')}>
                  <SvIcon name="chevron-right" size={14} />
                </button>
              )}
              <button type="button" className="sv-btn danger" onClick={() => onRemove(b.id)} style={{ padding: 6 }} aria-label={t('bookmark_removed')}>
                <SvIcon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
