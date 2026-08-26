import { useEffect, useState } from 'react';
import { SvIcon, SvLogo } from './icons.jsx';
import { t, LANGUAGES } from './i18n.js';

function LanguageSelect({ lang, onChange, compact }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDoc = () => setOpen(false);
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);
  return (
    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="sv-btn" onClick={() => setOpen((v) => !v)}
        aria-label={t('language')} aria-expanded={open} aria-haspopup="listbox"
        title={t('language')} style={{ padding: compact ? 8 : '8px 10px', fontWeight: 600, fontSize: 12 }}>
        <SvIcon name="globe" size={14} /> {lang.toUpperCase()}
      </button>
      {open && (
        <div className="menu" role="listbox" style={{ right: 0, top: 42 }}>
          {Object.entries(LANGUAGES).map(([k, label]) => (
            <button key={k} type="button" role="option" aria-selected={lang === k}
              onClick={() => { onChange(k); setOpen(false); }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SvHeader({
  timeRange, onTimeRange, isDark, onToggleTheme, isMobile, user,
  onOpenAuth, onOpenBookmarks, onOpenAbout, onOpenMenu, onOpenProfile,
  userMenuOpen, onUserMenuToggle, onSignOut, onOpenFilters, loading, onRefresh,
  lang, onLang, menuOpen, filtersOpen,
}) {
  const labels = { day: t('time_24h'), week: t('time_7d'), month: t('time_30d'), custom: t('time_custom') };
  if (isMobile) {
    return (
      <header className="sv-header mobile">
        <div className="sv-header-row">
          <button type="button" className="sv-btn" onClick={onOpenMenu} aria-label={t('menu')} aria-expanded={!!menuOpen} style={{ padding: 8 }}>
            <SvIcon name="menu" size={18} />
          </button>
          <div className="sv-brand">
            <SvLogo size={22} />
            <h1 className="sv-h1">ShakeViewer</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSelect lang={lang} onChange={onLang} compact />
            <button type="button" className="sv-btn" onClick={onOpenFilters} aria-label={t('filters')} aria-expanded={!!filtersOpen} style={{ padding: 8 }}>
              <SvIcon name="filter" size={18} />
            </button>
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="sv-header desktop">
      <div className="sv-brand">
        <SvLogo size={24} />
        <h1 className="sv-h1 desktop">ShakeViewer</h1>
        <span className="label sv-tagline" style={{ marginLeft: 6 }}>{t('tagline')}</span>
      </div>
      <div className="sv-header-right">
        <div className="seg">
          {['day', 'week', 'month', 'custom'].map((v) => (
            <button key={v} type="button" className={timeRange === v ? 'on' : ''} aria-pressed={timeRange === v}
              onClick={() => onTimeRange(v)}>{labels[v]}</button>
          ))}
        </div>
        {timeRange !== 'custom' && (
          <button type="button" className="sv-btn" onClick={onRefresh} aria-label={t('refresh')} title={t('refresh')} style={{ padding: 8 }}>
            <SvIcon name="refresh" size={16} className={loading ? 'spin' : ''} />
          </button>
        )}
        <LanguageSelect lang={lang} onChange={onLang} />
        <button type="button" className="sv-btn" onClick={onOpenAbout} aria-label={t('learn')} title={t('learn_title')} style={{ padding: 8 }}>
          <SvIcon name="book" size={16} />
        </button>
        <button type="button" className="sv-btn" onClick={onOpenBookmarks} aria-label={t('bookmarks')} title={t('bookmarks')} style={{ padding: 8, color: 'var(--mag-moderate)' }}>
          <SvIcon name="bookmark-filled" size={16} />
        </button>
        <button type="button" className="sv-btn" onClick={onToggleTheme}
          title={isDark ? t('light_mode') : t('dark_mode')} aria-pressed={!isDark}
          aria-label={isDark ? t('switch_to_light') : t('switch_to_dark')} style={{ padding: 8 }}>
          <SvIcon name={isDark ? 'sun' : 'moon'} size={17} />
        </button>
        {user ? (
          <div style={{ position: 'relative' }}>
            <button type="button" className="sv-btn" onClick={onUserMenuToggle} style={{ padding: 8 }} aria-label={t('profile')} aria-expanded={!!userMenuOpen}>
              <SvIcon name="user" size={16} />
            </button>
            {userMenuOpen && (
              <div className="menu" style={{ right: 0, top: 42 }}>
                <button type="button" onClick={onOpenProfile}><SvIcon name="user" size={14} />{t('profile')}</button>
                <button type="button" onClick={onOpenBookmarks}><SvIcon name="bookmark" size={14} />{t('bookmarks')}</button>
                <div className="sep" />
                <button type="button" onClick={onSignOut}><SvIcon name="logout" size={14} />{t('sign_out')}</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="sv-btn ghost" onClick={onOpenAuth}>
            <SvIcon name="user" size={14} />{t('sign_in')}
          </button>
        )}
      </div>
    </header>
  );
}
