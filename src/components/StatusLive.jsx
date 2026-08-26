import { t } from '../lib/i18n.js';

export function StatusLive({ kind, seconds, onRetry }) {
  if (kind === 'offline') {
    return (
      <span className="status-live offline">
        <span className="dot" />
        {t('offline')}
        {onRetry && <button className="sv-btn" style={{ height: 24, minHeight: 24, marginLeft: 6 }} onClick={onRetry}>{t('retry')}</button>}
      </span>
    );
  }
  if (kind === 'delayed') {
    return (
      <span className="status-live delayed">
        <span className="dot" />
        {t('delayed')}
        {seconds != null && <span className="mono"> · {seconds}s</span>}
      </span>
    );
  }
  return (
    <span className="status-live live">
      <span className="dot" />
      {t('live')}
      {seconds != null && <span className="mono"> · {seconds}s</span>}
    </span>
  );
}

export function QueryProgress({ active }) {
  if (!active) return <div className="sv-progress" style={{ visibility: 'hidden' }} />;
  return <div className="sv-progress" aria-hidden="true"><span /></div>;
}

export function DisclaimerBar() {
  return <div className="sv-disclaimer">{t('disclaimer')}</div>;
}

export function EmptyState({ mag, onClear }) {
  return (
    <div className="empty">
      <p>{t('no_events_floor', { mag: mag != null ? Number(mag).toFixed(1) : '—' })}</p>
      {onClear && <button className="sv-btn" onClick={onClear}>{t('clear_filters')}</button>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <p>{message}</p>
      {onRetry && <button className="sv-btn primary" onClick={onRetry}>{t('retry')}</button>}
    </div>
  );
}
