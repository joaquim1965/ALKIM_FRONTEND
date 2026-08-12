import { useEffect, useState } from 'react';
import { speakMenuLabel } from '../../hooks/useMenuSpeech';

const selector = '[data-speech-label], button[title], a[title], [role="button"][title], button[aria-label], a[aria-label], [role="button"][aria-label]';

export default function GlobalActionTooltip() {
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    let activeTarget = null;

    const getTarget = (node) => node instanceof Element ? node.closest(selector) : null;
    const getText = (target) => target?.dataset.globalTooltipTitle || target?.dataset.tooltip || target?.getAttribute('title') || target?.getAttribute('aria-label');
    const restoreTitle = () => {
      if (activeTarget?.dataset.globalTooltipTitle) {
        activeTarget.setAttribute('title', activeTarget.dataset.globalTooltipTitle);
        delete activeTarget.dataset.globalTooltipTitle;
      }
      activeTarget = null;
    };
    const hide = () => {
      restoreTitle();
      setTooltip(null);
    };
    const show = (target) => {
      const text = getText(target);
      if (!text) return;
      if (activeTarget === target) return;
      if (activeTarget && activeTarget !== target) restoreTitle();
      activeTarget = target;
      if (target.hasAttribute('title')) {
        target.dataset.globalTooltipTitle = target.getAttribute('title');
        target.removeAttribute('title');
      }
      const rect = target.getBoundingClientRect();
      const top = Math.min(window.innerHeight - 36, Math.max(8, rect.bottom + 8));
      const left = Math.min(window.innerWidth - 12, Math.max(12, rect.left + (rect.width / 2)));
      setTooltip({ text, top, left });
      speakMenuLabel(text);
    };
    const onPointerOver = (event) => show(getTarget(event.target));
    const onPointerOut = (event) => {
      const from = getTarget(event.target);
      const to = getTarget(event.relatedTarget);
      if (from && from !== to) hide();
    };
    const onFocus = (event) => show(getTarget(event.target));
    const onFocusOut = () => hide();

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      hide();
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (!tooltip) return null;
  return (
    <div
      role="tooltip"
      className="fixed z-[9999] -translate-x-1/2 rounded bg-surface1 border border-border px-2 py-1 text-xs text-on-surface1 shadow-xl pointer-events-none"
      style={{ top: tooltip.top, left: tooltip.left }}
    >
      {tooltip.text}
    </div>
  );
}
