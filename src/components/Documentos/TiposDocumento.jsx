/**
 * TiposDocumento — editor de los tipos de documento («etiquetas») de un tipo
 * de objeto (04/10/2026). Se abre con el lápiz de «Tipos de documentos» en la
 * pestaña Documentación (components/Documentos/DocumentosObjeto.jsx).
 *
 *   - Añadir, renombrar y borrar tipos; marcar obligatorio, caduca y
 *     confidencial; y, en entidades, para qué formas sale.
 *   - El catálogo es común a todos los objetos de esa tabla (todas las entidades).
 *   - Borrar un tipo con documentos avisa: sus documentos quedan huérfanos y
 *     pasan a «Sin clasificar» (no se borran).
 *   - DNI, firma y certificado no se pueden borrar: los usa la aplicación.
 *
 * API: GET /files/categorias?objeto= · POST /files/categorias ·
 *      PUT /files/categorias/:id · GET /files/categorias/:id/uso · DELETE /files/categorias/:id
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import Button from '../UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { Campo, AvisoError, CLASE_INPUT, BotonFila, BotonAnadir } from '../UI/TemaPagina';
import { VentanaEmergente } from '../UI/ZonaArchivos';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.body && !(opciones.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

const PROTEGIDOS = ['SIN_CLASIFICAR', 'DNI', 'DNI_ANVERSO', 'DNI_REVERSO', 'FIRMA', 'CERT_DIGITAL'];
const VACIO = { nombre: '', obligatorio: false, caduca: false, meses_aviso: 2, confidencial: false, condicion: '' };

export default function TiposDocumento({ tabla, t, nombreCat, onCerrar, onCambio, editarCodigo = null }) {
  const [tipos, setTipos] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);        // { id?, ...campos }
  const [ocupado, setOcupado] = useState(false);

  const FORMAS = [
    ['', t('forma_todas', 'Todas')], ['tipo=PERSONAL', t('forma_persona', 'Solo personas')],
    ['tipo<>PERSONAL', t('forma_no_persona', 'CB y sociedades')], ['tipo=CB|SC', t('forma_cb', 'Comunidades de bienes y SC')],
    ['tipo=SL|SA', t('forma_sl', 'SL y SA')],
  ];
  const nombreForma = (c) => (FORMAS.find(([v]) => v === (c || '')) || [null, c])[1];

  const cargar = useCallback(async () => {
    try {
      const { data } = await pedir(`/files/categorias?objeto=${encodeURIComponent(tabla)}`);
      setTipos((data || []).filter((c) => c.codigo !== 'SIN_CLASIFICAR'));
    } catch (e) { setError(e.message); }
  }, [tabla]);
  useEffect(() => { cargar(); }, [cargar]);
  // Abierto con un tipo elegido en el desplegable: directamente su formulario.
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (abierto || !editarCodigo || !tipos.length) return;
    const c = tipos.find((x) => x.codigo === editarCodigo);
    if (c) editar(c);
    setAbierto(true);
  }, [tipos, editarCodigo, abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!form.nombre.trim()) return setError(t('falta_nombre_tipo', 'Indica el nombre del tipo.'));
    setOcupado(true); setError('');
    try {
      const cuerpo = JSON.stringify({ ...form, objeto_tabla: tabla, condicion: form.condicion || null });
      await pedir(form.id ? `/files/categorias/${form.id}` : '/files/categorias', { method: form.id ? 'PUT' : 'POST', body: cuerpo });
      setForm(null); await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const borrar = async (c) => {
    setError('');
    try {
      const { data } = await pedir(`/files/categorias/${c.id}/uso?objeto=${encodeURIComponent(tabla)}`);
      const n = Number(data.archivos);
      const pregunta = n
        ? t('aviso_huerfanos', 'Hay documentos en este grupo que quedarán huérfanos ({n}). Pasarán a «Sin clasificar». ¿Borrar el tipo «{tipo}»?').replace('{n}', n).replace('{tipo}', nombreCat(c))
        : t('confirmar_borrar_tipo', '¿Borrar el tipo «{tipo}»?').replace('{tipo}', nombreCat(c));
      if (!window.confirm(pregunta)) return;
      await pedir(`/files/categorias/${c.id}?objeto=${encodeURIComponent(tabla)}`, { method: 'DELETE' });
      await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
  };

  const editar = (c) => setForm({
    id: c.id, nombre: nombreCat(c), obligatorio: Boolean(Number(c.obligatorio)), caduca: Boolean(Number(c.caduca)),
    meses_aviso: c.meses_aviso || 2, confidencial: Boolean(Number(c.confidencial)), condicion: c.condicion || '',
  });
  const casilla = (k, txt) => (
    <label className="flex items-center gap-2 text-sm font-bold">
      <input type="checkbox" className="h-5 w-5" checked={Boolean(form[k])} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} />{txt}
    </label>
  );

  return (
    <VentanaEmergente titulo={t('tipos_documentos', 'Tipos de documentos')} etiquetaCerrar={t('cerrar', 'Cerrar')} onCerrar={onCerrar} ancho="max-w-4xl">
      <div className="space-y-4">
        <AvisoError>{error}</AvisoError>
        <div className="flex items-center gap-3">
          {!form && <BotonAnadir texto={t('nuevo_tipo', 'Nuevo tipo de documento')} onClick={() => { setError(''); setForm({ ...VACIO }); }} pequeno />}
          <p className="text-sm font-bold">{t('tipos_ayuda', 'Los tipos son comunes a todas las fichas de este apartado.')}</p>
        </div>

        {form && (
          <form onSubmit={guardar} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Campo etiqueta={t('nombre_tipo', 'Nombre del tipo')}>
                <input autoFocus value={form.nombre} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={CLASE_INPUT} />
              </Campo>
            </div>
            {tabla === 'm_company' && (
              <Campo etiqueta={t('para_formas', 'Para qué entidades')}>
                <select value={form.condicion} onChange={(e) => setForm((f) => ({ ...f, condicion: e.target.value }))} className={CLASE_INPUT}>
                  {FORMAS.map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
                </select>
              </Campo>
            )}
            <div className="flex flex-wrap items-end gap-4">
              {casilla('obligatorio', t('obligatorio', 'Obligatorio'))}
              {casilla('confidencial', t('confidencial_corto', 'Confidencial'))}
              {casilla('caduca', t('caduca_tipo', 'Caduca'))}
              {form.caduca && (
                <label className="flex items-center gap-2 text-sm font-bold">
                  {t('avisar_meses', 'Avisar')}
                  <input type="number" min="1" max="24" value={form.meses_aviso} onChange={(e) => setForm((f) => ({ ...f, meses_aviso: e.target.value }))} className={`${CLASE_INPUT} w-20`} />
                  {t('meses_antes', 'meses antes')}
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
              <Button type="submit" loading={ocupado} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-table-header text-[11px] font-black uppercase tracking-widest text-on-table-header">
              <tr>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">{t('nombre_tipo', 'Nombre del tipo')}</th>
                {tabla === 'm_company' && <th className="px-3 py-2">{t('para_formas', 'Para qué entidades')}</th>}
                <th className="px-3 py-2">{t('obligatorio', 'Obligatorio')}</th>
                <th className="px-3 py-2">{t('caduca_tipo', 'Caduca')}</th>
                <th className="px-3 py-2">{t('confidencial_corto', 'Confidencial')}</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((c) => (
                <tr key={c.id} className="border-t border-border bg-table-row text-on-table-row">
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <BotonFila icono={<Pencil size={15} />} titulo={t('editar_tipo', 'Editar tipo')} onClick={() => { setError(''); editar(c); }} />
                    {!PROTEGIDOS.includes(c.codigo) && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar_tipo', 'Borrar tipo')} onClick={() => borrar(c)} />}
                  </td>
                  <td className="px-3 py-1.5 font-black">{nombreCat(c)}</td>
                  {tabla === 'm_company' && <td className="px-3 py-1.5">{nombreForma(c.condicion)}</td>}
                  <td className="px-3 py-1.5">{Number(c.obligatorio) ? <Check size={16} aria-label={t('si', 'Sí')} /> : <X size={14} aria-label={t('no', 'No')} />}</td>
                  <td className="px-3 py-1.5">{Number(c.caduca) ? `${t('si', 'Sí')}${c.meses_aviso ? ` · ${c.meses_aviso} m` : ''}` : '—'}</td>
                  <td className="px-3 py-1.5">{Number(c.confidencial) ? t('si', 'Sí') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </VentanaEmergente>
  );
}
