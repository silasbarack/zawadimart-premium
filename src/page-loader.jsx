import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import brandIcon from './assets/brand/icon.png';

// Loading between pages, the way a real website loads a new page. When a link or button
// opens another page, a loading circle covers it until that page is really ready: the data
// it fetches (pages report this with usePageWork) and the images on screen have loaded.
// So it is brief on a fast connection and lasts as long as needed on a slow one.

const MIN_VISIBLE_MS = 350; // long enough to register, so a fast load doesn't just flicker
const GIVE_UP_MS = 12000; // after this, show the page anyway; it keeps loading in place
const SLOW_NOTE_MS = 4000;

const PageWorkContext = createContext(() => () => {});

// A page calls usePageWork(true) while it is still loading something it needs to show.
export function usePageWork(busy) {
  const register = useContext(PageWorkContext);
  useEffect(() => (busy ? register() : undefined), [busy, register]);
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const onScreenImages = () => [...document.querySelectorAll('main img')].filter((img) => {
  const r = img.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
});
const imageSettled = (img) => (img.complete ? Promise.resolve() : new Promise((resolve) => {
  img.addEventListener('load', resolve, { once: true });
  img.addEventListener('error', resolve, { once: true });
}));

export function PageTransitions({ labelFor, ready = true, children }) {
  const location = useLocation();
  const [load, setLoad] = useState(null); // { key, label, start, leaving }
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const work = useRef(0);
  const [workChanged, setWorkChanged] = useState(0);
  const lastPath = useRef(location.pathname);

  const register = useCallback(() => {
    work.current += 1;
    setWorkChanged((n) => n + 1);
    return () => { work.current -= 1; setWorkChanged((n) => n + 1); };
  }, []);

  // A new page: cover it before it is painted. Filters that only change ?query don't count.
  useLayoutEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    setLoad({ key: location.key, label: labelFor(location.pathname), start: performance.now(), leaving: false });
    setProgress(0.12);
    setNote('');
  }, [location.key]);

  // Wait for the page's data, then its on-screen images, then lift the cover.
  useEffect(() => {
    if (!load || load.leaving || work.current > 0 || !ready) return undefined;
    let cancelled = false;
    (async () => {
      setProgress((p) => Math.max(p, 0.55));
      await nextFrame();
      const images = onScreenImages();
      let settled = 0;
      await Promise.all(images.map((img) => imageSettled(img).then(() => {
        settled += 1;
        if (!cancelled) setProgress((p) => Math.max(p, 0.55 + 0.4 * (settled / images.length)));
      })));
      if (cancelled) return;
      const shownFor = performance.now() - load.start;
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, MIN_VISIBLE_MS - shownFor)));
      if (cancelled) return;
      setProgress(1);
      setLoad((current) => (current?.key === load.key ? { ...current, leaving: true } : current));
    })();
    return () => { cancelled = true; };
  }, [load?.key, load?.leaving, workChanged, ready]);

  // While loading: creep forward, explain slow or offline connections, and never hang forever.
  useEffect(() => {
    if (!load || load.leaving) return undefined;
    const tick = setInterval(() => {
      const waited = performance.now() - load.start;
      setProgress((p) => Math.min(0.9, p + (0.9 - p) * 0.04));
      setNote(!navigator.onLine ? "You're offline. This page will load when you're connected."
        : waited > SLOW_NOTE_MS ? 'Your connection seems slow. Still loading…' : '');
      if (waited > GIVE_UP_MS) setLoad((current) => (current?.key === load.key ? { ...current, leaving: true } : current));
    }, 150);
    return () => clearInterval(tick);
  }, [load?.key, load?.leaving]);

  // Fade out, then remove.
  useEffect(() => {
    if (!load?.leaving) return undefined;
    const timer = setTimeout(() => setLoad((current) => (current?.leaving ? null : current)), 220);
    return () => clearTimeout(timer);
  }, [load?.leaving]);

  return (
    <PageWorkContext.Provider value={register}>
      {children}
      {load && (
        <div className={`page-loader${load.leaving ? ' leaving' : ''}`} role="status" aria-live="polite">
          <div className="page-loader-ring">
            <svg viewBox="0 0 112 112" aria-hidden="true">
              <circle className="track" cx="56" cy="56" r="50" />
              <circle className="arc" cx="56" cy="56" r="50" strokeDasharray="314.16" style={{ strokeDashoffset: 314.16 * (1 - progress) }} />
              <circle className="spin" cx="56" cy="56" r="50" strokeDasharray="18 296.16" />
            </svg>
            <img src={brandIcon} alt="" />
          </div>
          <p className="page-loader-label">{load.leaving ? 'Ready' : load.label}</p>
          <p className="page-loader-note">{note}</p>
        </div>
      )}
    </PageWorkContext.Provider>
  );
}
