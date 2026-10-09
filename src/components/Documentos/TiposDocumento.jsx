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
 *   - Orden y subtipos arrastrando filas con el ratón (06/10/2026): soltar en
 *     el borde de arriba/abajo de otra fila cambia el orden; soltar en el
 *     centro la deja como subtipo de esa. Solo cambia cómo se ven; los
 *     documentos de cada tipo no se tocan.
 *
 * API: GET /files/categorias?objeto= · POST /files/categorias ·
 *      PUT /files/categorias/:id · PUT /files/categorias/orden · GET /files/categorias/:id/uso · DELETE /files/categorias/:id
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Check, X, GripVertical, CornerDownRight } from 'lucide-react';
import Button from '../UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { Campo, AvisoError, CLASE_INPUT, BotonFila, BotonAnadir } from '../UI/TemaPagina';
import { VentanaEmergente } from '../UI/ZonaArchivos';
import { ordenArbol, moverTipo } from './ordenTipos';
import { useStore } from '../../hooks/useStore';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.body && !(opciones.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

const PROTEGIDOS = ['SIN_CLASIFICAR', 'DNI', 'DNI_ANVERSO', 'DNI_REVERSO', 'FIRMA', 'CERT_DIGITAL'];
const VACIO = { nombre: '', obligatorio: false, caduca: false, meses_aviso: 2, confidencial: false, condicion: '' };

// `cuentas` (08/10/2026): { categoria_id: n } con los documentos que tiene la ficha abierta;
// se ven entre paréntesis tras el nombre de cada tipo (sin `cuentas`, no se ven).
// `enLinea` (08/10/2026): se pinta dentro de la página, sin ventana emergente
// (Documentos → Plantillas, en pages/Sistema/ExploradorArchivosPage.jsx).
/**
 * Antes de borrar un grupo (09/10/2026): si tiene subgrupos o documentos no se
 * puede (hay que vaciarlo antes) y se avisa; si está vacío, se pide confirmar.
 * Devuelve true si hay que borrarlo.
 */
export function confirmarBorrarGrupo(t, nombre, uso) {
  const subgrupos = Number(uso?.subgrupos) || 0; const documentos = Number(uso?.archivos) || 0;
  if (subgrupos || documentos) {
    window.alert(t('grupo_no_vacio', 'El grupo «{tipo}» tiene {subgrupos} subgrupo(s) y {documentos} documento(s).\n\nPara poder eliminar el grupo, primero hay que vaciarlo.')
      .replace('{tipo}', nombre).replace('{subgrupos}', subgrupos).replace('{documentos}', documentos));
    return false;
  }
  return window.confirm(t('confirmar_borrar_grupo', '¿Estás seguro de eliminar el grupo «{tipo}»?').replace('{tipo}', nombre));
}

/** Ventana emergente, o nada si se pinta dentro de la página. */
function Envoltorio({ enLinea, children, ...ventana }) {
  if (enLinea) return children;
  return <VentanaEmergente {...ventana} ancho="max-w-4xl">{children}</VentanaEmergente>;
}

// `sinObligatorio` (09/10/2026): no se ve ni se toca «Obligatorio» (plantilla de entidades).
export default function TiposDocumento({ tabla, t, nombreCat, onCerrar, onCambio, editarCodigo = null, cuentas = null, enLinea = false, sinObligatorio = false }) {
  const [tipos, setTipos] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);        // { id?, ...campos }
  const [ocupado, setOcupado] = useState(false);
  const [arrastrado, setArrastrado] = useState(null);   // id de la fila que se arrastra
  const [destino, setDestino] = useState(null);         // { id, zona: 'antes' | 'despues' | 'dentro' }

  const FORMAS = [
    ['', t('forma_todas', 'Todas')], ['tipo=PERSONAL', t('forma_persona', 'Solo personas')],
    // «Comunidades de bienes y SC» quitada (09/10/2026): era lo mismo que «CB, SL y SA».
    ['tipo<>PERSONAL', t('forma_no_persona', 'CB, SL y SA')], ['tipo=SL|SA', t('forma_sl', 'SL y SA')],
  ];
  const nombreForma = (c) => (FORMAS.find(([v]) => v === (c || '')) || [null, c])[1];

  const cargar = useCallback(async () => {
    try {
      const { data } = await pedir(`/files/categorias?objeto=${encodeURIComponent(tabla)}`);
      setTipos(ordenArbol((data || []).filter((c) => c.codigo !== 'SIN_CLASIFICAR')));
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
      // El nombre que se ve sale del diccionario (s_dictionary, contexto CategoriaArchivo): el servidor
      // lo actualiza y sube la versión del idioma; se vuelve a pedir para verlo al momento (06/10/2026).
      const { fetchLanguage, language } = useStore.getState();
      await fetchLanguage?.(language);
      setForm(null); await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  };

  const borrar = async (c) => {
    setError('');
    try {
      const { data } = await pedir(`/files/categorias/${c.id}/uso?objeto=${encodeURIComponent(tabla)}`);
      if (!confirmarBorrarGrupo(t, nombreCat(c), data)) return;
      await pedir(`/files/categorias/${c.id}?objeto=${encodeURIComponent(tabla)}`, { method: 'DELETE' });
      await cargar(); onCambio?.();
    } catch (e) { setError(e.message); }
  };

  // ── Arrastrar filas: orden y subtipos ──────────────────────────────────────
  const zonaDe = (ev, c) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const y = (ev.clientY - r.top) / r.height;
    const puedeDentro = moverTipo(tipos, arrastrado, c.id, 'dentro') != null;
    // Reparto a partes iguales (09/10/2026, petición del usuario): la mitad central de la fila
    // es «dentro» (subtipo) y el hueco entre dos filas (el 25 % de abajo de una + el 25 % de
    // arriba de la siguiente) es «entre las dos». Así las dos zonas miden lo mismo.
    if (puedeDentro && y >= 0.25 && y <= 0.75) return 'dentro';
    return y < 0.5 ? 'antes' : 'despues';
  };
  const sobreFila = (ev, c) => {
    if (arrastrado == null || arrastrado === c.id) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const zona = zonaDe(ev, c);
    if (destino?.id !== c.id || destino?.zona !== zona) setDestino({ id: c.id, zona });
  };
  const soltar = async (ev, c) => {
    ev.preventDefault();
    const nueva = destino && arrastrado != null ? moverTipo(tipos, arrastrado, c.id, destino.zona) : null;
    setArrastrado(null); setDestino(null);
    if (!nueva) return;
    const antes = tipos;
    setTipos(nueva); setError('');
    try {
      await pedir('/files/categorias/orden', {
        method: 'PUT',
        body: JSON.stringify({ objeto_tabla: tabla, tipos: nueva.map((x) => ({ id: x.id, padre_id: x.padre_id })) }),
      });
      onCambio?.();
    } catch (e) { setTipos(antes); setError(e.message); }
  };
  const marcaDestino = (c) => {
    if (destino?.id !== c.id) return '';
    if (destino.zona === 'antes') return 'shadow-[inset_0_4px_0_0_currentColor]';
    if (destino.zona === 'despues') return 'shadow-[inset_0_-4px_0_0_currentColor]';
    return 'outline outline-2 -outline-offset-2 outline-current';
  };
  // Dentro (subtipo): la fila toma el fondo de los botones de aceptar del tema («success»:
  // verde en el oscuro) para distinguirlo a simple vista de «delante» o «detrás», que solo
  // llevan una raya (09/10/2026). Con estilo en línea, para que gane al fondo de la fila.
  const fondoDestino = (c) => (destino?.id === c.id && destino.zona === 'dentro'
    ? { backgroundColor: 'var(--color-success)', color: 'var(--color-on-success)' } : undefined);

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
    <Envoltorio enLinea={enLinea} titulo={t('tipos_documentos', 'Tipos de documentos')} etiquetaCerrar={t('cerrar', 'Cerrar')} onCerrar={onCerrar}>
      <div className="space-y-4">
        <AvisoError>{error}</AvisoError>
        <div className="flex items-center gap-3">
          {!form && <BotonAnadir texto={t('nuevo_tipo', 'Nuevo tipo de documento')} onClick={() => { setError(''); setForm({ ...VACIO }); }} pequeno />}
          <p className="text-sm font-bold">
            {t('tipos_ayuda', 'Los tipos son comunes a todas las fichas de este apartado.')}{' '}
            {t('tipos_arrastrar', 'Arrastra una fila con el ratón: al borde de otra para cambiar el orden, encima de otra para dejarla como subtipo (también dentro de un subtipo).')}
          </p>
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
              {!sinObligatorio && casilla('obligatorio', t('obligatorio', 'Obligatorio'))}
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
              {/* La cabecera también recibe la fila: soltarla aquí la pone la PRIMERA de todas
                  (09/10/2026). Antes, al subir hasta arriba se salía de la lista y no se movía. */}
              <tr
                onDragOver={(ev) => {
                  const primero = tipos[0];
                  if (arrastrado == null || !primero || arrastrado === primero.id) return;
                  ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
                  if (destino?.id !== primero.id || destino?.zona !== 'antes') setDestino({ id: primero.id, zona: 'antes' });
                }}
                onDrop={(ev) => { if (tipos[0]) soltar(ev, tipos[0]); }}
                className={arrastrado != null && destino?.id === tipos[0]?.id && destino?.zona === 'antes' ? 'shadow-[inset_0_-4px_0_0_currentColor]' : ''}
              >
                <th className="px-3 py-2" />
                <th className="px-3 py-2">{t('nombre_tipo', 'Nombre del tipo')}</th>
                {tabla === 'm_company' && <th className="px-3 py-2">{t('para_formas', 'Para qué entidades')}</th>}
                {!sinObligatorio && <th className="px-3 py-2">{t('obligatorio', 'Obligatorio')}</th>}
                <th className="px-3 py-2">{t('caduca_tipo', 'Caduca')}</th>
                <th className="px-3 py-2">{t('confidencial_corto', 'Confidencial')}</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((c) => (
                <tr
                  key={c.id} draggable
                  onDragStart={(ev) => { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(c.id)); setArrastrado(c.id); }}
                  onDragEnd={() => { setArrastrado(null); setDestino(null); }}
                  onDragOver={(ev) => sobreFila(ev, c)}
                  onDrop={(ev) => soltar(ev, c)}
                  className={`border-t border-border bg-table-row text-on-table-row ${arrastrado === c.id ? 'opacity-50' : ''} ${marcaDestino(c)}`}
                  style={fondoDestino(c)}
                >
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <span className="mr-1 inline-flex cursor-grab align-middle active:cursor-grabbing" title={t('arrastrar_tipo', 'Arrastrar para ordenar')} aria-label={t('arrastrar_tipo', 'Arrastrar para ordenar')}>
                      <GripVertical size={16} />
                    </span>
                    <BotonFila icono={<Pencil size={15} />} titulo={t('editar_tipo', 'Editar tipo')} onClick={() => { setError(''); editar(c); }} />
                    {!PROTEGIDOS.includes(c.codigo) && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar_tipo', 'Borrar tipo')} onClick={() => borrar(c)} />}
                  </td>
                  {/* Sangría por nivel (09/10/2026): cada nivel de subtipo, 24 px más adentro. */}
                  <td className={`px-3 py-1.5 ${c.nivel ? 'font-bold' : 'font-black'}`} style={{ paddingLeft: `${12 + (c.nivel || 0) * 24}px` }}>
                    {c.nivel ? <CornerDownRight size={14} className="mr-2 inline align-[-2px]" aria-label={t('subtipo', 'Subtipo')} /> : null}
                    {nombreCat(c)}
                    {cuentas && <span className="ml-1 font-bold" title={t('docs_en_ficha', 'Documentos de esta ficha')}>({cuentas[c.id] || 0})</span>}
                  </td>
                  {tabla === 'm_company' && <td className="px-3 py-1.5">{nombreForma(c.condicion)}</td>}
                  {!sinObligatorio && <td className="px-3 py-1.5">{Number(c.obligatorio) ? <Check size={16} aria-label={t('si', 'Sí')} /> : <X size={14} aria-label={t('no', 'No')} />}</td>}
                  <td className="px-3 py-1.5">{Number(c.caduca) ? `${t('si', 'Sí')}${c.meses_aviso ? ` · ${c.meses_aviso} m` : ''}` : '—'}</td>
                  <td className="px-3 py-1.5">{Number(c.confidencial) ? t('si', 'Sí') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Envoltorio>
  );
}
