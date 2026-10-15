import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Dialog({
  onClose,
  titleId,
  labelledBy,
  className = '',
  wide = false,
  wider = false,
  children,
  align = 'center',
}) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const panel = panelRef.current;
    const nodes = () =>
      [...(panel?.querySelectorAll(FOCUSABLE) || [])].filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
      );
    const first = nodes()[0];
    (first || panel)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = nodes();
      if (!list.length) {
        e.preventDefault();
        return;
      }
      const i = list.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          list[list.length - 1].focus();
        }
      } else if (i === list.length - 1 || i === -1) {
        e.preventDefault();
        list[0].focus();
      }
    };
    panel.addEventListener('keydown', onKey);
    return () => {
      panel.removeEventListener('keydown', onKey);
      const prev = previousFocus.current;
      if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch {}
      }
    };
  }, [onClose]);

  const cardClass = ['modal-card', wide ? 'wide' : '', wider ? 'wider' : '', className].filter(Boolean).join(' ');
  const backdropStyle = align === 'top' ? { alignItems: 'flex-start', paddingTop: 60 } : undefined;

  return (
    <div className="modal-backdrop" onClick={onClose} style={backdropStyle}>
      <div
        ref={panelRef}
        className={cardClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId || labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
