import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Gives each page its own browser-tab title, as a separate web page would have.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ZawadiMart` : 'ZawadiMart | Shop, Save, Get Rewarded';
  }, [title]);
}

const positions = new Map();
// window.scrollTo would inherit the stylesheet's smooth scrolling; page changes jump instead.
const jumpTo = (top) => window.scrollTo({ top, left: 0, behavior: 'instant' });

// Makes moving between pages behave like ordinary web pages: a new page opens at the
// top straight away (no scrolling animation), and Back or Forward returns to where you
// were on that page. Filters that only change the address's ?query keep your place.
export function usePageScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(location.pathname);
  const currentKey = useRef(location.key);

  // Remember each page's scroll position as you scroll. One listener for the whole app,
  // writing to whichever page is current.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const save = () => positions.set(currentKey.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useLayoutEffect(() => {
    // Switch pages before the browser reports any scroll caused by the new page's height,
    // so the page you left keeps the position you left it at.
    currentKey.current = location.key;
    const pathChanged = lastPath.current !== location.pathname;
    lastPath.current = location.pathname;
    const saved = positions.get(location.key);
    if (navigationType === 'POP' && saved !== undefined) {
      // The page may still be filling in, so keep trying for a moment until it is tall enough.
      let frames = 0;
      const restore = () => {
        jumpTo(saved);
        if (Math.abs(window.scrollY - saved) > 2 && frames++ < 60) requestAnimationFrame(restore);
      };
      restore();
    } else if (pathChanged) {
      jumpTo(0);
    }
  }, [location.key]);
}
