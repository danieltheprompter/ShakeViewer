import { useEffect, useState } from 'react';
import { getFirebase, loadFirebase } from '../firebase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    loadFirebase()
      .then((fb) => {
        unsub = fb.onAuthStateChanged(fb.auth, (u) => {
          setUser(u);
          setReady(true);
        });
      })
      .catch(() => setReady(true));
    return () => unsub();
  }, []);

  const signOut = async () => {
    const fb = getFirebase();
    if (fb) await fb.signOut(fb.auth);
  };

  return { user, ready, signOut };
}

export function useBookmarks(user) {
  const [ids, setIds] = useState(() => new Set());
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!user) {
      try {
        const local = JSON.parse(localStorage.getItem('shakeviewer_bookmarks') || '[]');
        setDocs(local);
        setIds(new Set(local.map((b) => b.quakeId)));
      } catch {
        setDocs([]);
        setIds(new Set());
      }
      return undefined;
    }
    let unsub = () => {};
    loadFirebase().then((fb) => {
      const q = fb.query(fb.collection(fb.db, 'users', user.uid, 'bookmarks'), fb.orderBy('timestamp', 'desc'));
      unsub = fb.onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDocs(rows);
        setIds(new Set(rows.map((b) => b.quakeId)));
      });
    }).catch(() => {});
    return () => unsub();
  }, [user]);

  const toggle = async (quake) => {
    if (!user) return 'auth';
    const fb = await loadFirebase();
    const existing = docs.find((b) => b.quakeId === quake.id);
    if (existing) {
      await fb.deleteDoc(fb.doc(fb.db, 'users', user.uid, 'bookmarks', existing.id));
      return 'removed';
    }
    await fb.addDoc(fb.collection(fb.db, 'users', user.uid, 'bookmarks'), {
      quakeId: quake.id,
      mag: quake.mag,
      place: quake.place,
      time: quake.time,
      lat: quake.lat,
      lng: quake.lon,
      depth: quake.depthKm,
      source: quake.source,
      timestamp: fb.serverTimestamp(),
    });
    return 'added';
  };

  return { ids, docs, toggle };
}

export function useMedia() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const on = () => setMobile(window.innerWidth < 1024);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return mobile;
}
