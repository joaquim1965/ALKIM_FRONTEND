// src/components/SoundToggle.jsx

/**
 * SoundToggle — altavoz de la barra superior para oír o no los rótulos.
 *
 * Pedido el 25/09/2026. Al pasar el cursor por un botón o un tooltip la
 * aplicación lee su texto en voz alta (`useMenuSpeech.jsx`). Hasta hoy solo se
 * podía apagar desde Panel de control; ahora está a un clic, junto al idioma.
 *
 *   · Altavoz               → se oye (situación por defecto).
 *   · Altavoz con barra roja → silenciado.
 *
 * El estado es el mismo que el de Panel de control —`localStorage`, llave
 * `sonidos`— y los dos interruptores se avisan por `EVENTO_SONIDOS`.
 *
 * El rótulo va en `aria-label`, así que el tooltip global lo dibuja y lo lee
 * como el de cualquier otro botón. Al silenciar, lo último que se oye es
 * «Activar sonido», que es justo lo que habría que pulsar para volver.
 */

import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useTmTr } from '../contexts/TmTrContext';
import { sonidosHabilitados, habilitarSonidos, EVENTO_SONIDOS, speakMenuLabel } from '../hooks/useMenuSpeech';

const SoundToggle = () => {
  const { t } = useTmTr('Navbar');
  const [conSonido, setConSonido] = useState(() => sonidosHabilitados());

  useEffect(() => {
    const alCambiar = (e) => setConSonido(Boolean(e.detail));
    window.addEventListener(EVENTO_SONIDOS, alCambiar);
    return () => window.removeEventListener(EVENTO_SONIDOS, alCambiar);
  }, []);

  const rotulo = conSonido
    ? t('SonidoSilenciar', 'Silenciar sonido')
    : t('SonidoActivar', 'Activar sonido');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={conSonido}
      aria-label={rotulo}
      onClick={() => {
        const nuevo = !conSonido;
        setConSonido(nuevo);
        habilitarSonidos(nuevo);
        // Al activarlo se lee en el acto el rótulo que pasa a enseñar el
        // tooltip («Silenciar sonido»): el cursor ya estaba encima y, como
        // estaba en silencio, no se había leído nada (26/09/2026).
        if (nuevo) speakMenuLabel(t('SonidoSilenciar', 'Silenciar sonido'));
      }}
      className="relative flex items-center px-3 py-2 rounded-lg transition-all duration-200 hover:bg-navbar-hover hover:text-on-navbar-hover"
    >
      <span className="relative inline-flex">
        <Volume2 className="w-5 h-5" />
        {/* La barra roja transversal: una línea encima del mismo altavoz, no
            otro dibujo, para que se vea que es el mismo control apagado. */}
        {!conSonido && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[2.5px] w-[26px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-destructive"
          />
        )}
      </span>
    </button>
  );
};

export default SoundToggle;
