/**
 * ClavesPestana — pestaña «Claves» de la ficha de la propiedad (30/10/2026, petición del usuario).
 *
 * Lista Descripción · Usuario · Clave · Notas (im_property_key). La clave se guarda cifrada y
 * sale oculta (••••••): el ojo la muestra y el botón de copiar la pone en el portapapeles; las
 * dos cosas piden permiso de escritura y quedan en la auditoría (s_audit, ACCESO, sin el valor).
 * Al editar, la clave en blanco no se cambia.
 *
 * API: /propiedades/:id/claves[/:k[/ver]] — BACKEND/controllers/clavesController.js
 * Textos: s_dictionary, contexto «Claves» (BACKEND/migrations/2026.10.30g - claves de la propiedad.sql)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import {
  Panel, CabeceraPanel, Campo, AvisoError, Ayuda, VentanaModal, CLASE_INPUT, TablaTema, claseFila, TD, BotonFila, FilaVacia,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const json = opciones.body && !(opciones.body instanceof FormData);
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(json ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0] ? `${b.errors[0].field ? `${b.errors[0].field}: ` : ''}${b.errors[0].message}` : (b.message || `Error ${r.status}`));
  return b;
}

const VACIA = { descripcion: '', usuario: '', clave: '', notas: '' };

export default function ClavesPestana({ propiedadId, puedeEscribir }) {
  const { t } = useTmTr('Claves');
  const base = `/propiedades/${propiedadId}/claves`;
  const [claves, setClaves] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [visibles, setVisibles] = useState({});        // id → clave en claro (solo mientras se ve)
  const [copiada, setCopiada] = useState(null);
  const [modal, setModal] = useState(null);            // null | { id?: number }
  const [form, setForm] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { setClaves((await pedir(base)).data || []); } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, [base]);
  useEffect(() => { cargar(); setVisibles({}); }, [cargar]);

  const leer = async (k, para) => (await pedir(`${base}/${k.id}/ver?para=${para}`)).data?.clave || '';

  const alternar = async (k) => {
    if (visibles[k.id] != null) { setVisibles(({ [k.id]: _, ...resto }) => resto); return; }
    try { const clave = await leer(k, 'ver'); setVisibles((v) => ({ ...v, [k.id]: clave })); } catch (e) { setError(e.message); }
  };
  const copiar = async (k) => {
    try {
      const clave = visibles[k.id] ?? await leer(k, 'copiar');
      await navigator.clipboard.writeText(clave);
      setCopiada(k.id); setTimeout(() => setCopiada((c) => (c === k.id ? null : c)), 1500);
    } catch (e) { setError(e.message); }
  };

  const abrir = (k = null) => {
    setErrorModal('');
    setForm(k ? { descripcion: k.descripcion || '', usuario: k.usuario || '', clave: '', notas: k.notas || '' } : VACIA);
    setModal(k ? { id: k.id, tieneClave: k.tiene_clave } : {});
  };
  const guardar = async (ev) => {
    ev.preventDefault();
    if (!form.descripcion.trim()) return setErrorModal(t('falta_descripcion', 'Indica la descripción.'));
    setGuardando(true); setErrorModal('');
    try {
      const cuerpo = { ...form, descripcion: form.descripcion.trim() };
      if (modal.id && !cuerpo.clave) delete cuerpo.clave;
      await pedir(modal.id ? `${base}/${modal.id}` : base, { method: modal.id ? 'PUT' : 'POST', body: JSON.stringify(cuerpo) });
      if (modal.id) setVisibles(({ [modal.id]: _, ...resto }) => resto);
      setModal(null);
      await cargar();
    } catch (e) { setErrorModal(e.message); } finally { setGuardando(false); }
  };
  const borrar = async (k) => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar esta clave?'))) return;
    try { await pedir(`${base}/${k.id}`, { method: 'DELETE' }); await cargar(); } catch (e) { setError(e.message); }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });
  const columnas = [
    ...(puedeEscribir ? [{ texto: '' }] : []),
    { texto: t('descripcion', 'Descripción') }, { texto: t('usuario', 'Usuario') }, { texto: t('clave', 'Clave') }, { texto: t('notas', 'Notas') },
  ];

  return (
    <div className="space-y-4">
      <AvisoError>{error}</AvisoError>
      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<KeyRound size={20} />} titulo={t('titulo', 'Claves')} contador={String(claves.length)}
          anadir={puedeEscribir ? { texto: t('nueva', 'Nueva clave'), onClick: () => abrir() } : undefined} />
        <div className="space-y-3 p-4">
          <Ayuda>{t('ayuda', 'Las claves se guardan cifradas. Cada vez que alguien ve o copia una, queda anotado en la auditoría.')}</Ayuda>
          <TablaTema columnas={columnas}>
            {!cargando && !claves.length && <FilaVacia columnas={columnas.length}>{t('vacio', 'Todavía no hay claves.')}</FilaVacia>}
            {claves.map((k, i) => {
              const vista = visibles[k.id];
              return (
                <tr key={k.id} className={claseFila(i)}>
                  {puedeEscribir && (
                    <td className={`${TD} whitespace-nowrap`}>
                      <BotonFila icono={<Pencil size={13} />} titulo={t('editar', 'Editar clave')} onClick={() => abrir(k)} />
                      <BotonFila icono={<Trash2 size={13} />} titulo={t('borrar', 'Borrar')} onClick={() => borrar(k)} />
                    </td>
                  )}
                  <td className={`${TD} font-black`}>{k.descripcion}</td>
                  <td className={`${TD} select-all font-mono text-xs`}>{k.usuario || ''}</td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {k.tiene_clave && (
                      <span className="inline-flex items-center gap-2">
                        <span className={`font-mono text-sm ${vista != null ? 'select-all' : ''}`}>{vista != null ? vista : '••••••'}</span>
                        {puedeEscribir && <>
                          <BotonFila icono={vista != null ? <EyeOff size={13} /> : <Eye size={13} />} titulo={vista != null ? t('ocultar', 'Ocultar la clave') : t('ver', 'Ver la clave')} onClick={() => alternar(k)} />
                          <BotonFila icono={copiada === k.id ? <Check size={13} /> : <Copy size={13} />} titulo={copiada === k.id ? t('copiada', 'Clave copiada') : t('copiar', 'Copiar la clave')} onClick={() => copiar(k)} />
                        </>}
                      </span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-pre-wrap text-xs`}>{k.notas || ''}</td>
                </tr>
              );
            })}
          </TablaTema>
        </div>
      </Panel>

      {modal && (
        <VentanaModal ancho="max-w-xl" icono={<KeyRound size={20} />} titulo={modal.id ? t('editar', 'Editar clave') : t('nueva', 'Nueva clave')} onCerrar={() => !guardando && setModal(null)}>
          <form onSubmit={guardar} className="mt-4 space-y-4">
            <AvisoError>{errorModal}</AvisoError>
            <Campo etiqueta={t('descripcion', 'Descripción')}><input autoFocus maxLength={150} {...f('descripcion')} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('usuario', 'Usuario')}><input maxLength={150} autoComplete="off" {...f('usuario')} className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('clave', 'Clave')}>
              <input type="text" maxLength={500} autoComplete="off" spellCheck={false} {...f('clave')} className={`${CLASE_INPUT} font-mono`} />
              {modal.id && modal.tieneClave && <span className="mt-1 block text-xs font-bold">{t('clave_sin_cambiar', 'Déjala en blanco para no cambiarla.')}</span>}
            </Campo>
            <Campo etiqueta={t('notas', 'Notas')}><textarea rows={6} maxLength={5000} {...f('notas')} className={`${CLASE_INPUT} resize-y`} /></Campo>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>{t('cancelar', 'Cancelar')}</Button>
              <Button type="submit" loading={guardando}>{t('guardar', 'Guardar')}</Button>
            </div>
          </form>
        </VentanaModal>
      )}
    </div>
  );
}
