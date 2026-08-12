import { useEffect } from 'react';

const shortcut = (event) => event.ctrlKey && event.altKey && event.key === 'Enter';

export function speakMenuLabel(label) {
  if (!label || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(label);
  utterance.lang = document.documentElement.lang || 'es-ES';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export default function useMenuSpeech() {
  useEffect(() => {
    const labelFor = (element) => {
      const select = element?.closest?.('select');
      if (select) {
        const option = select.options[select.selectedIndex];
        const prefix = select.getAttribute('aria-label') || select.dataset.speechLabel || '';
        return [prefix, option?.textContent?.trim()].filter(Boolean).join(': ');
      }
      const target = element?.closest?.('[data-speech-label]');
      return target?.dataset.speechLabel || '';
    };
    const readTarget = (event) => {
      speakMenuLabel(labelFor(event.target));
    };
    const readFocused = (event) => {
      if (!shortcut(event)) return;
      const label = labelFor(document.activeElement);
      if (!label) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      speakMenuLabel(label);
    };
    const readSelectMovement = (event) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      if (!(event.target instanceof HTMLSelectElement)) return;
      window.setTimeout(() => speakMenuLabel(labelFor(event.target)), 0);
    };

    document.addEventListener('change', readTarget, true);
    document.addEventListener('keydown', readFocused, true);
    document.addEventListener('keyup', readSelectMovement, true);
    return () => {
      document.removeEventListener('change', readTarget, true);
      document.removeEventListener('keydown', readFocused, true);
      document.removeEventListener('keyup', readSelectMovement, true);
    };
  }, []);
}
