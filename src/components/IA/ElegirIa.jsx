/**
 * ElegirIa — ventana «La IA está saturada» (18/10/2026, petición del usuario).
 *
 * El backend reintenta 2 veces; si la IA sigue saturada responde 503 IA_SATURADA y
 * services/api.js llama a `window.__elegirIa({ mensaje, proveedor })`. Aquí se
 * enseñan las IA activas (GET /ia/disponibles) con su precio y se elige otra, o se
 * sigue con la misma. Devuelve el id elegido (api.js repite la petición con la
 * cabecera X-IA-Proveedor) o null si se cancela.
 *
 * Montada una vez en App.jsx.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, RotateCcw, Check } from 'lucide-react';
import Button from '../UI/Button';
import { VentanaModal, AvisoAtencion, Ayuda, TablaTema, claseFila, TD, SinDato } from '../UI/TemaPagina';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

const PROVEEDORES = { ANTHROPIC: 'Anthropic', OPENAI: 'OpenAI', GOOGLE: 'Google' };
const precio = (v) => (v == null ? null : String(Number(v)).replace('.', ','));

export default function ElegirIa() {
  const { t } = useTmTr('Ia');
  const [peticion, setPeticion] = useState(null);   // { mensaje, proveedor }
  const [lista, setLista] = useState([]);
  const [elegida, setElegida] = useState('');
  const resolver = useRef(null);

  useEffect(() => {
    window.__elegirIa = (datos) => new Promise((resolve) => {
      resolver.current = resolve;
      setPeticion(datos);
      setElegida('');
      apiFetch('/ia/disponibles', { headers: authHeaders() })
        .then((r) => r.json()).then((b) => {
          const l = b.data || [];
          setLista(l);
          // Propuesta: la primera que no sea la saturada.
          const otra = l.find((x) => x.id !== datos.proveedor?.id);
          setElegida(otra ? String(otra.id) : '');
        })
        .catch(() => setLista([]));
    });
    return () => { delete window.__elegirIa; };
  }, []);

  const cerrar = (id) => {
    resolver.current?.(id || null);
    resolver.current = null;
    setPeticion(null);
  };

  if (!peticion) return null;
  const saturada = peticion.proveedor;
  const otras = lista.filter((x) => x.id !== saturada?.id);

  return (
    <VentanaModal titulo={t('saturada_titulo', 'La IA está saturada')} icono={<Sparkles size={20} />} onCerrar={() => cerrar(null)} ancho="max-w-3xl">
      <div className="space-y-4">
        <AvisoAtencion>{peticion.mensaje}</AvisoAtencion>
        <Ayuda>{t('saturada_texto', 'Lo he intentado 3 veces. Puedes usar otra IA de la lista o volver a intentarlo con la misma.')}</Ayuda>
        {otras.length === 0 && <Ayuda>{t('sin_otras', 'No hay otras IA activas. Dalas de alta en Auxiliares ▸ Claves de IA.')}</Ayuda>}
        {lista.length > 0 && (
          <TablaTema columnas={[
            { texto: '' }, { texto: 'IA' }, { texto: t('modelo', 'Modelo') },
            { texto: `${t('precio', 'Precio')} (${t('entrada_salida', 'entrada / salida, $ por millón de tokens')})`, derecha: true },
          ]}>
            {lista.map((x, i) => {
              const esLa = x.id === saturada?.id;
              return (
                <tr key={x.id} className={`${claseFila(i, { seleccionada: String(x.id) === elegida, clic: !esLa })}`} onClick={() => !esLa && setElegida(String(x.id))}>
                  <td className={TD}>
                    <input type="radio" name="ia-elegida" disabled={esLa} checked={String(x.id) === elegida} onChange={() => setElegida(String(x.id))}
                      aria-label={x.nombre} className="h-4 w-4" />
                  </td>
                  <td className={TD}>
                    <span className="font-black">{x.nombre}</span>
                    <div className="text-xs">{PROVEEDORES[x.proveedor] || x.proveedor}{esLa ? ` · ${t('la_saturada', 'La que ha fallado')}` : ''}</div>
                  </td>
                  <td className={`${TD} font-mono text-xs`}>{x.modelo}</td>
                  <td className={`${TD} text-right font-mono`}>
                    {x.precio_entrada == null && x.precio_salida == null
                      ? <SinDato texto={t('sin_precio', 'Sin precio')} />
                      : `${precio(x.precio_entrada) ?? '—'} / ${precio(x.precio_salida) ?? '—'}`}
                  </td>
                </tr>
              );
            })}
          </TablaTema>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => cerrar(null)}>{t('cancelar', 'Cancelar')}</Button>
          {saturada && (
            <Button type="button" variant="secondary" leftIcon={<RotateCcw size={16} />} onClick={() => cerrar(saturada.id)}>
              {t('seguir_misma', 'Seguir con «{n}»').replace('{n}', saturada.nombre)}
            </Button>
          )}
          <Button type="button" leftIcon={<Check size={16} />} disabled={!elegida} onClick={() => cerrar(Number(elegida))}>
            {t('usar_elegida', 'Usar la elegida')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
