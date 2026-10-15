import { useEffect, useState } from 'react';
import { loadFirebase, getFirebase, friendlyAuthError } from './firebase.js';
import { Dialog } from './dialog.jsx';
import { SvIcon } from './icons.jsx';
import { t } from './i18n.js';
import { TERMS_VERSION } from './pages.jsx';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const applyUser = async (fb, u) => {
    if (!u) { setUser(null); return; }
    setUser({
      uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL,
      metadata: u.metadata, providerData: u.providerData,
      updateProfile: (p) => fb.updateProfile(u, p),
    });
  };

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const existing = getFirebase();
      if (existing) {
        unsub = existing.onAuthStateChanged(existing.auth, async (u) => {
          await applyUser(existing, u);
          setAuthLoading(false);
          try { if (u) localStorage.setItem('sv_has_account', '1'); } catch {}
        });
        return;
      }
      let should = false;
      try { should = localStorage.getItem('sv_has_account') === '1'; } catch {}
      if (!should) { setAuthLoading(false); return; }
      try {
        const fb = await loadFirebase();
        if (cancelled) return;
        unsub = fb.onAuthStateChanged(fb.auth, async (u) => {
          await applyUser(fb, u);
          setAuthLoading(false);
          try { if (u) localStorage.setItem('sv_has_account', '1'); } catch {}
        });
      } catch { if (!cancelled) setAuthLoading(false); }
    })();
    return () => { cancelled = true; unsub(); };
  }, []);

  const ensureFb = () => loadFirebase();

  return {
    user,
    authLoading,
    ensureLoaded: ensureFb,
    signInEmail: async (e, p) => {
      const fb = await ensureFb();
      return fb.signInWithEmailAndPassword(fb.auth, e, p);
    },
    signUpEmail: async (e, p, n) => {
      const fb = await ensureFb();
      const r = await fb.createUserWithEmailAndPassword(fb.auth, e, p);
      if (n) await fb.updateProfile(r.user, { displayName: n });
      return r;
    },
    signInGoogle: async () => {
      const fb = await ensureFb();
      return fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider());
    },
    resetPassword: async (e) => {
      const fb = await ensureFb();
      return fb.sendPasswordResetEmail(fb.auth, e);
    },
    signOut: async () => {
      const fb = getFirebase();
      if (fb) await fb.signOut(fb.auth);
    },
    deleteAccount: async (pw) => {
      const fb = getFirebase();
      const u = fb.auth.currentUser;
      if (u.providerData[0]?.providerId === 'password' && pw) {
        const cred = fb.EmailAuthProvider.credential(u.email, pw);
        await fb.reauthenticateWithCredential(u, cred);
      }
      const uid = u.uid;
      if (fb.db) {
        const batch = fb.writeBatch(fb.db);
        for (const col of ['searchHistory', 'bookmarks']) {
          const docs = await fb.getDocs(fb.collection(fb.db, 'users', uid, col));
          docs.forEach((d) => batch.delete(d.ref));
        }
        batch.delete(fb.doc(fb.db, 'users', uid));
        await batch.commit();
      }
      await fb.deleteUser(u);
    },
  };
}

export function useFirestoreCollection(user, name) {
  const [data, setData] = useState([]);
  useEffect(() => {
    const fb = getFirebase();
    if (!user || !fb?.db) { setData([]); return; }
    const q = fb.query(fb.collection(fb.db, 'users', user.uid, name), fb.orderBy('timestamp', 'desc'));
    return fb.onSnapshot(q, (s) => setData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.warn('[ShakeViewer]', name, 'snapshot error:', e));
  }, [user, name]);
  return {
    data,
    add: async (doc) => {
      const fb = getFirebase();
      if (!user || !fb?.db) return;
      return fb.addDoc(fb.collection(fb.db, 'users', user.uid, name), { ...doc, timestamp: fb.serverTimestamp() });
    },
    remove: async (id) => {
      const fb = getFirebase();
      if (!user || !fb?.db) return;
      return fb.deleteDoc(fb.doc(fb.db, 'users', user.uid, name, id));
    },
    update: async (id, patch) => {
      const fb = getFirebase();
      if (!user || !fb?.db) return;
      return fb.updateDoc(fb.doc(fb.db, 'users', user.uid, name, id), patch);
    },
  };
}

export function AuthModal({ auth, onClose, onOpenTerms, onOpenPrivacy }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [termsOK, setTermsOK] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const writeConsent = async (uid) => {
    const fb = getFirebase();
    if (!fb?.db) return;
    try {
      await fb.setDoc(fb.doc(fb.db, 'users', uid), {
        termsAcceptedAt: fb.serverTimestamp(),
        termsVersion: TERMS_VERSION,
        privacyPolicyAcceptedAt: fb.serverTimestamp(),
        privacyPolicyVersion: TERMS_VERSION,
      }, { merge: true });
    } catch {}
  };

  const run = async (fn) => {
    setErr(null); setOk(null); setBusy(true);
    try { await fn(); } catch (e) { setErr(friendlyAuthError(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog onClose={onClose} titleId="auth-title">
      <div className="modal-head">
        <h3 id="auth-title" className="display" style={{ fontSize: 22, margin: 0 }}>{mode === 'signin' ? t('welcome_back') : t('create_account')}</h3>
        <button type="button" className="sv-btn" onClick={onClose} style={{ padding: 8 }} aria-label={t('close')}><SvIcon name="close" size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setErr(null); }}>{t('sign_in')}</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(null); }}>{t('sign_up')}</button>
        </div>
        <button type="button" className="sv-btn ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
          onClick={() => run(async () => {
            if (!termsOK) throw new Error(t('please_accept_terms'));
            const r = await auth.signInGoogle();
            await writeConsent(r.user.uid);
            onClose();
          })} disabled={busy}>
          <SvIcon name="google" size={14} /> {t('continue_with_google')}
        </button>
        <form onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (mode === 'signup') {
              if (!termsOK) throw new Error(t('please_accept_terms'));
              const r = await auth.signUpEmail(email, password, name);
              await writeConsent(r.user.uid);
            } else {
              await auth.signInEmail(email, password);
            }
            onClose();
          });
        }}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 10 }}>
              <label className="label" style={{ marginBottom: 4, display: 'block' }} htmlFor="sv-auth-name">{t('display_name')}</label>
              <input id="sv-auth-name" className="sv-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <label className="label" style={{ marginBottom: 4, display: 'block' }} htmlFor="sv-auth-email">{t('email')}</label>
            <input id="sv-auth-email" className="sv-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="label" style={{ marginBottom: 4, display: 'block' }} htmlFor="sv-auth-password">{t('password')}</label>
            <input id="sv-auth-password" className="sv-input" type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <label htmlFor="sv-auth-terms" style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--fg-2)', marginBottom: 14, alignItems: 'flex-start' }}>
            <input id="sv-auth-terms" type="checkbox" checked={termsOK} onChange={(e) => setTermsOK(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{t('i_agree')} <button type="button" onClick={onOpenTerms} style={{ color: 'var(--accent)', background: 'none', padding: 0, textDecoration: 'underline' }}>{t('terms_of_use')}</button> {t('and_word')} <button type="button" onClick={onOpenPrivacy} style={{ color: 'var(--accent)', background: 'none', padding: 0, textDecoration: 'underline' }}>{t('privacy_policy')}</button></span>
          </label>
          {err && <div className="error-banner" style={{ margin: 0, marginBottom: 10 }}><SvIcon name="alert" size={14} /> {err}</div>}
          {ok && <div style={{ padding: '8px 12px', marginBottom: 10, color: '#4ade80', fontSize: 12 }}>{ok}</div>}
          <button type="submit" className="sv-btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? t('please_wait') : (mode === 'signin' ? t('sign_in') : t('create_account'))}
          </button>
        </form>
        {mode === 'signin' && (
          <button type="button" onClick={() => run(async () => {
            if (!email) throw new Error(t('enter_email_first'));
            await auth.resetPassword(email);
            setOk(t('reset_email_sent'));
          })} style={{ color: 'var(--fg-2)', fontSize: 12, marginTop: 12, background: 'none' }}>{t('forgot_password')}</button>
        )}
      </div>
    </Dialog>
  );
}

export function ProfileModal({ user, auth, onClose }) {
  const [delConfirm, setDelConfirm] = useState('');
  const [delPw, setDelPw] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const isEmailUser = user.providerData?.[0]?.providerId === 'password';
  return (
    <Dialog onClose={onClose} titleId="profile-title" wide>
      <div className="modal-head">
        <h3 id="profile-title" className="display" style={{ fontSize: 22, margin: 0 }}>{t('profile')}</h3>
        <button type="button" className="sv-btn" onClick={onClose} style={{ padding: 8 }} aria-label={t('close')}><SvIcon name="close" size={16} /></button>
      </div>
      <div className="modal-body">
        <div className="display" style={{ fontSize: 22 }}>{user.displayName || user.email?.split('@')[0]}</div>
        <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 16 }}>{user.email}</div>
        {err && <div className="error-banner"><SvIcon name="alert" size={14} /> {err}</div>}
        <details>
          <summary style={{ fontSize: 13, color: '#ef4444', padding: '8px 0', cursor: 'pointer' }}>{t('delete_account')}</summary>
          <p style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>{t('delete_warning')}</p>
          <input className="sv-input" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} placeholder={t('type_delete')} style={{ marginBottom: 6 }} />
          {isEmailUser && <input className="sv-input" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder={t('password')} style={{ marginBottom: 8 }} />}
          <button type="button" className="sv-btn danger" disabled={busy || delConfirm !== 'DELETE'} onClick={async () => {
            setBusy(true); setErr(null);
            try { await auth.deleteAccount(delPw); onClose(); } catch (e) { setErr(friendlyAuthError(e)); } finally { setBusy(false); }
          }}>{t('delete_my_account')}</button>
        </details>
      </div>
      <div className="modal-footer">
        <button type="button" className="sv-btn" onClick={() => { auth.signOut(); onClose(); }}>
          <SvIcon name="logout" size={14} /> {t('sign_out')}
        </button>
      </div>
    </Dialog>
  );
}
