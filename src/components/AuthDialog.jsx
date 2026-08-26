import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { friendlyAuthError, loadFirebase } from '../firebase.js';
import { t } from '../lib/i18n.js';
import { Icon } from './Icons.jsx';

export function AuthDialog({ fullPage, onClose, onAuthed }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [termsOK, setTermsOK] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    loadFirebase().catch((e) => setErr(friendlyAuthError(e)));
  }, []);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const els = node.querySelectorAll('button, input');
    els[0]?.focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [mode]);

  const run = async (fn) => {
    setErr(null); setOk(null); setBusy(true);
    try { await fn(); } catch (e) { setErr(friendlyAuthError(e)); } finally { setBusy(false); }
  };

  const dismissRef = useRef(() => {});
  const dismiss = () => {
    if (onClose) onClose();
    else nav('/');
  };
  dismissRef.current = dismiss;

  const finish = () => {
    onAuthed?.();
    dismiss();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      dismissRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const signIn = () => run(async () => {
    const fb = await loadFirebase();
    await fb.signInWithEmailAndPassword(fb.auth, email, password);
    finish();
  });

  const signUp = () => run(async () => {
    if (!termsOK) throw new Error(t('please_accept_terms'));
    if ((password || '').length < 8) throw new Error(t('password_min8'));
    const fb = await loadFirebase();
    const r = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
    if (name) await fb.updateProfile(r.user, { displayName: name });
    await fb.setDoc(fb.doc(fb.db, 'users', r.user.uid), {
      termsAcceptedAt: fb.serverTimestamp(),
      termsVersion: '2026-08-26',
      privacyPolicyAcceptedAt: fb.serverTimestamp(),
    }, { merge: true });
    finish();
  });

  const google = () => run(async () => {
    if (!termsOK) throw new Error(t('please_accept_terms'));
    const fb = await loadFirebase();
    const r = await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider());
    await fb.setDoc(fb.doc(fb.db, 'users', r.user.uid), {
      termsAcceptedAt: fb.serverTimestamp(),
      termsVersion: '2026-08-26',
      privacyPolicyAcceptedAt: fb.serverTimestamp(),
    }, { merge: true });
    finish();
  });

  const forgot = () => run(async () => {
    if (!email) throw new Error(t('enter_email_first'));
    const fb = await loadFirebase();
    await fb.sendPasswordResetEmail(fb.auth, email);
    setOk(t('reset_email_sent'));
  });

  const body = (
    <div className="dialog" ref={box} role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 id="auth-title">{mode === 'signin' ? t('welcome_back') : t('create_account')}</h2>
        <button className="sv-btn icon" onClick={dismiss} aria-label={t('close')}><Icon name="close" size={16} /></button>
      </div>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>{t('sign_in')}</button>
        <button className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>{t('sign_up')}</button>
      </div>
      <label style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 10, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={termsOK} onChange={(e) => setTermsOK(e.target.checked)} />
        <span>{t('i_agree')} <Link to="/terms">{t('terms_of_use')}</Link> {t('and_word')} <Link to="/privacy">{t('privacy_policy')}</Link></span>
      </label>
      <button className="sv-btn" style={{ width: '100%', marginBottom: 12 }} onClick={google} disabled={busy}>
        <Icon name="google" size={14} /> {t('continue_with_google')}
      </button>
      <div className="label" style={{ textAlign: 'center', margin: '8px 0' }}>{t('or')}</div>
      <form onSubmit={(e) => { e.preventDefault(); mode === 'signin' ? signIn() : signUp(); }}>
        {mode === 'signup' && (
          <div className="field">
            <label className="label">{t('display_name')}</label>
            <input className="sv-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label className="label">{t('email')}</label>
          <input className="sv-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t('password')}</label>
          <input className="sv-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p className="meta" style={{ color: 'var(--live-off)' }}>{err}</p>}
        {ok && <p className="meta">{ok}</p>}
        <button type="submit" className="sv-btn primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? t('please_wait') : (mode === 'signin' ? t('sign_in') : t('create_account'))}
        </button>
      </form>
      {mode === 'signin' && <button className="sv-btn" style={{ marginTop: 10 }} onClick={forgot}>{t('forgot_password')}</button>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="dialog-backdrop auth-page" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
        {body}
      </div>
    );
  }
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      {body}
    </div>
  );
}
