import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLang, LANGUAGES, setLang, t } from '../lib/i18n.js';
import { Icon, Logo } from './Icons.jsx';

export function AppHeader({ theme, onToggleTheme, user, onSignOut, isMobile }) {
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lang = getLang();
  const nav = useNavigate();

  useEffect(() => {
    const close = () => { setLangOpen(false); setUserOpen(false); setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="sv-header">
      {isMobile && (
        <button className="sv-btn icon" aria-label={t('filters')} onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}>
          <Icon name="menu" size={18} />
        </button>
      )}
      <Link to="/" className="sv-header-brand">
        <Logo size={22} />
        <span className="header-brand">ShakeViewer</span>
      </Link>
      <div className="sv-header-right" onClick={(e) => e.stopPropagation()}>
        {!isMobile && (
          <Link to="/search" className="sv-btn icon" aria-label={t('search')} title={t('search')}><Icon name="search" size={16} /></Link>
        )}
        <div style={{ position: 'relative' }}>
          <button className="sv-btn" onClick={() => setLangOpen((v) => !v)} aria-label={t('language')}>
            <Icon name="globe" size={14} />
            <span className="mono">{lang.toUpperCase()}</span>
          </button>
          {langOpen && (
            <div className="menu">
              {Object.entries(LANGUAGES).map(([k, v]) => (
                <button key={k} onClick={() => { setLang(k); setLangOpen(false); window.dispatchEvent(new Event('sv-lang')); }}>
                  <span className="mono" style={{ width: 22 }}>{k.toUpperCase()}</span> {v}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="sv-btn icon" onClick={onToggleTheme} aria-label={theme === 'dark' ? t('light_mode') : t('dark_mode')}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
        {user ? (
          <div style={{ position: 'relative' }}>
            <button className="sv-btn" onClick={() => setUserOpen((v) => !v)}>
              <Icon name="user" size={14} /> {user.displayName || user.email?.split('@')[0]}
            </button>
            {userOpen && (
              <div className="menu">
                <button onClick={() => { onSignOut(); setUserOpen(false); }}>{t('sign_out')}</button>
              </div>
            )}
          </div>
        ) : (
          <button className="sv-btn" onClick={() => nav('/signin')}>
            <Icon name="user" size={14} /> {t('sign_in')}
          </button>
        )}
        {isMobile && menuOpen && (
          <div className="menu" style={{ right: 0, top: 40 }}>
            <button onClick={() => { nav('/search'); setMenuOpen(false); }}><Icon name="search" size={14} /> {t('search')}</button>
            <button onClick={() => { nav('/about'); setMenuOpen(false); }}>{t('about')}</button>
            <button onClick={() => { nav('/faq'); setMenuOpen(false); }}>{t('faq')}</button>
          </div>
        )}
      </div>
    </header>
  );
}
