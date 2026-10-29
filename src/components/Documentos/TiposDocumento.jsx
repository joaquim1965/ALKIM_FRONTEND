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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Check, X, GripVertical, CornerDownRight } from 'lucide-react';
import Button from '../UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { Campo, AvisoError, CLASE_INPUT, BotonFila, BotonAnadir } from '../UI/TemaPagina';
import { VentanaEmergente } from '../UI/ZonaArchivos';
import { ordenArbol, moverTipo, subarbol, NIVEL_MAXIMO } from './ordenTipos';
import { useStore } from '../../hooks/useStore';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.body && !(opciones.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
  return b;
}

// FACTURAS_PERIODICAS (15/10/2026): raíz de la pestaña Facturas; no se ve en ella y no se borra.
// CONTRATOS_ALQUILER y CONTRATO_ARRENDAMIENTO (16/10/2026): raíz de Contratos → Documentos y el tipo que se lee.
const PROTEGIDOS = ['SIN_CLASIFICAR', 'DNI', 'DNI_ANVERSO', 'DNI_REVERSO', 'FIRMA', 'CERT_DIGITAL', 'FACTURAS_PERIODICAS', 'CONTRATOS_ALQUILER', 'CONTRATO_ARRENDAMIENTO'];
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
// grupo / excluirGrupo (15/10/2026): cada pestaña ve solo sus tipos (Facturas: el grupo
// FACTURAS; Documentos: todo menos él). El catálogo es el mismo: el orden se guarda entero.
export default function TiposDocumento({ tabla, t, nombreCat, onCerrar, onCambio, editarCodigo = null, cuentas = null, enLinea = false, sinObligatorio = false, grupo = null, excluirGrupo = null }) {
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
  const raizGrupo = grupo ? tipos.find((c) => c.codigo === grupo) : null;
  // excluirGrupo: un código o una lista (16/10/2026: Documentos excluye FACTURAS y CONTRATOS).
  const excluidos = [].concat(excluirGrupo || []);
  /** Los tipos que se ven de una lista (toda, solo el grupo o todo menos el grupo). */
  const visiblesDe = (lista) => {
    if (!grupo && !excluidos.length) return lista;
    if (!grupo) {
      const fuera = new Set();
      for (const codigo of excluidos) {
        const r = lista.find((c) => c.codigo === codigo);
        if (r) subarbol(lista, r.id).forEach((x) => fuera.add(x));
      }
      return lista.filter((c) => !fuera.has(Number(c.id)));
    }
    const raiz = lista.find((c) => c.codigo === grupo);
    const ids = raiz ? subarbol(lista, raiz.id) : new Set();
    // Con `grupo`, la raíz no se enseña: sus hijos salen como tipos principales (15/10/2026).
    return lista.filter((c) => ids.has(Number(c.id)) === Boolean(grupo) && !(grupo && raiz && Number(c.id) === Number(raiz.id)));
  };
  // Nivel que se pinta: con `grupo`, uno menos (la raíz no se ve).
  const nivelDe = (c) => Math.max(0, (c.nivel || 0) - (grupo ? 1 : 0));
  const visibles = visiblesDe(tipos);
  /**
   * Movimiento permitido (15/10/2026): el tipo arrastrado tiene que seguir viéndose en
   * esta lista después de soltarlo, y la raíz del grupo no se mueve. Antes, soltar
   * delante del primero sacaba el tipo de FACTURAS y desaparecía de la pestaña.
   */
  const movimiento = (idDestino, zona) => {
    if (raizGrupo && grupo && Number(arrastrado) === Number(raizGrupo.id)) return null;
    const nueva = moverTipo(tipos, arrastrado, idDestino, zona);
    if (!nueva) return null;
    if (!visiblesDe(nueva).some((c) => Number(c.id) === Number(arrastrado))) return null;
    if (grupo && raizGrupo && nueva.find((c) => Number(c.id) === Number(raizGrupo.id))?.padre_id != null) return null;
    return nueva;
  };
  // Primera fila a la que lleva soltar en la cabecera: con `grupo`, la primera DENTRO del grupo
  // (soltar delante del propio grupo lo sacaría de la pestaña).
  const primeraFila = visibles[0];
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
    // Pestaña de un grupo cuya raíz aún no existe (p. ej. CONTRATOS antes de aplicar su migración, 16/10/2026):
    // el tipo se crearía fuera del grupo y no se vería aquí. Se avisa en lugar de crearlo.
    if (grupo && !raizGrupo) return setError(t('falta_raiz_grupo', 'Falta el grupo «{g}» en la base de datos: reinicia el backend para que se aplique su migración.').replace('{g}', grupo));
    setOcupado(true); setError('');
    try {
      const cuerpo = JSON.stringify({ ...form, objeto_tabla: tabla, condicion: form.condicion || null });
      const r = await pedir(form.id ? `/files/categorias/${form.id}` : '/files/categorias', { method: form.id ? 'PUT' : 'POST', body: cuerpo });
      // «Pertenece a» (16/10/2026): el tipo va al final de la etiqueta elegida. Sin elegir,
      // es principal (en la pestaña de un grupo, principal dentro del grupo).
      const idTipo = form.id || r?.data?.id;
      const padreNuevo = form.padreId ? Number(form.padreId) : (grupo && raizGrupo ? Number(raizGrupo.id) : null);
      const padreAntes = form.id ? (form.padreOriginal ?? null) : null;
      if (idTipo && padreNuevo !== padreAntes) {
        const { data } = await pedir(`/files/categorias?objeto=${encodeURIComponent(tabla)}`);
        const lista = ordenArbol((data || []).filter((c) => c.codigo !== 'SIN_CLASIFICAR'));
        let nueva = null;
        if (padreNuevo != null) nueva = moverTipo(lista, idTipo, padreNuevo, 'dentro');
        else {
          const propios = subarbol(lista, idTipo);
          const ultimo = [...lista].reverse().find((c) => c.padre_id == null && !propios.has(Number(c.id)));
          nueva = ultimo ? moverTipo(lista, idTipo, ultimo.id, 'despues') : null;
        }
        if (nueva) {
          await pedir('/files/categorias/orden', {
            method: 'PUT',
            body: JSON.stringify({ objeto_tabla: tabla, tipos: nueva.map((x) => ({ id: x.id, padre_id: x.padre_id })) }),
          });
        } else if (padreNuevo != null) {
          setError(t('no_cabe_ahi', 'No se puede poner ahí: pasaría del número máximo de niveles.'));
        }
      }
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
    const puedeDentro = movimiento(c.id, 'dentro') != null;
    // Reparto a partes iguales (09/10/2026, petición del usuario): la mitad central de la fila
    // es «dentro» (subtipo) y el hueco entre dos filas (el 25 % de abajo de una + el 25 % de
    // arriba de la siguiente) es «entre las dos». Así las dos zonas miden lo mismo.
    if (puedeDentro && y >= 0.25 && y <= 0.75) return 'dentro';
    const zona = y < 0.5 ? 'antes' : 'despues';
    return movimiento(c.id, zona) ? zona : null;   // null: ahí no se puede soltar
  };
  const sobreFila = (ev, c) => {
    if (arrastrado == null || arrastrado === c.id) return;
    const zona = zonaDe(ev, c);
    if (!zona) { if (destino?.id === c.id) setDestino(null); return; }   // sin preventDefault: no se puede soltar
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    if (destino?.id !== c.id || destino?.zona !== zona) setDestino({ id: c.id, zona });
  };
  const soltar = async (ev, c) => {
    ev.preventDefault();
    const nueva = destino && arrastrado != null ? movimiento(c.id, destino.zona) : null;
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
  // ── Desplazar la lista mientras se arrastra (15/10/2026, petición del usuario) ──
  // Con una fila cogida: en la parte de abajo de la zona visible la lista baja (hasta
  // enseñar la última fila); en la de arriba, sube (hasta la primera). Más rápido
  // cuanto más cerca del borde; en el centro se queda quieta.
  const tablaRef = useRef(null);
  useEffect(() => {
    if (arrastrado == null) return undefined;
    const contenedor = (() => {
      for (let el = tablaRef.current?.parentElement; el; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      }
      return null;   // la página
    })();
    let y = null;
    let marco = 0;
    const alMover = (ev) => { y = ev.clientY; };
    const paso = () => {
      if (y != null) {
        const r = contenedor ? contenedor.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        const arriba = Math.max(r.top, 0);
        const abajo = Math.min(r.bottom, window.innerHeight);
        const alto = abajo - arriba;
        const banda = alto * 0.3;                       // 30 % de arriba y 30 % de abajo
        let v = 0;
        if (y < arriba + banda) v = -Math.ceil(14 * (1 - Math.max(0, y - arriba) / banda));
        else if (y > abajo - banda) v = Math.ceil(14 * (1 - Math.max(0, abajo - y) / banda));
        if (v) { if (contenedor) contenedor.scrollTop += v; else window.scrollBy(0, v); }
      }
      marco = requestAnimationFrame(paso);
    };
    document.addEventListener('dragover', alMover);
    marco = requestAnimationFrame(paso);
    return () => { document.removeEventListener('dragover', alMover); cancelAnimationFrame(marco); };
  }, [arrastrado]);

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

  const editar = (c) => {
    const padre = c.padre_id == null ? null : Number(c.padre_id);
    // En la pestaña de un grupo, colgar de la raíz (que no se ve) es ser principal.
    const visible = padre != null && !(grupo && raizGrupo && padre === Number(raizGrupo.id));
    setForm({
      id: c.id, nombre: nombreCat(c), obligatorio: Boolean(Number(c.obligatorio)), caduca: Boolean(Number(c.caduca)),
      meses_aviso: c.meses_aviso || 2, confidencial: Boolean(Number(c.confidencial)), condicion: c.condicion || '',
      padreId: visible ? String(padre) : '', padreOriginal: padre,
    });
  };
  // Etiquetas a las que puede pertenecer el tipo del formulario: todas las que se ven,
  // menos él mismo y lo que cuelga de él, y sin pasar del máximo de niveles.
  const padresPosibles = () => {
    const propios = form?.id ? subarbol(tipos, form.id) : new Set();
    return visibles.filter((c) => !propios.has(Number(c.id))
      && (form?.id ? moverTipo(tipos, form.id, c.id, 'dentro') != null : (c.nivel || 0) < NIVEL_MAXIMO));
  };
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
            {/* A qué etiqueta pertenece (16/10/2026): se puede cambiar aquí, sin arrastrar. */}
            <div className="sm:col-span-2">
              <Campo etiqueta={t('pertenece_a', 'Pertenece a')}>
                <select value={form.padreId || ''} onChange={(e) => setForm((f) => ({ ...f, padreId: e.target.value }))} className={CLASE_INPUT}>
                  <option value="">{t('etiqueta_principal', '— Ninguna: es una etiqueta principal —')}</option>
                  {padresPosibles().map((c) => (
                    <option key={c.id} value={String(c.id)}>{`${'\u00A0\u00A0\u00A0'.repeat(nivelDe(c))}${nivelDe(c) ? '↳ ' : ''}${nombreCat(c)}`}</option>
                  ))}
                </select>
              </Campo>
            </div>
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

        <div ref={tablaRef} className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-table-header text-[11px] font-black uppercase tracking-widest text-on-table-header">
              {/* La cabecera también recibe la fila: soltarla aquí la pone la PRIMERA de todas
                  (09/10/2026). Antes, al subir hasta arriba se salía de la lista y no se movía. */}
              <tr
                onDragOver={(ev) => {
                  const primero = primeraFila;
                  if (arrastrado == null || !primero || arrastrado === primero.id || !movimiento(primero.id, 'antes')) return;
                  ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
                  if (destino?.id !== primero.id || destino?.zona !== 'antes') setDestino({ id: primero.id, zona: 'antes' });
                }}
                onDrop={(ev) => { if (primeraFila) soltar(ev, primeraFila); }}
                className={arrastrado != null && destino?.id === primeraFila?.id && destino?.zona === 'antes' ? 'shadow-[inset_0_-4px_0_0_currentColor]' : ''}
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
              {visibles.map((c) => (
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
                    {/* Flecha: nuevo subtipo dentro de esta fila (16/10/2026). No sale si ya está en el último nivel. */}
                    {(c.nivel || 0) < NIVEL_MAXIMO && (
                      <BotonFila icono={<CornerDownRight size={15} />} titulo={t('nuevo_subtipo', 'Nuevo subtipo dentro de «{tipo}»').replace('{tipo}', nombreCat(c))}
                        onClick={() => { setError(''); setForm({ ...VACIO, padreId: String(c.id) }); }} />
                    )}
                    {!PROTEGIDOS.includes(c.codigo) && <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar_tipo', 'Borrar tipo')} onClick={() => borrar(c)} />}
                  </td>
                  {/* Sangría por nivel (09/10/2026): cada nivel de subtipo, 24 px más adentro. */}
                  <td className={`px-3 py-1.5 ${nivelDe(c) ? 'font-bold' : 'font-black'}`} style={{ paddingLeft: `${12 + nivelDe(c) * 24}px` }}>
                    {nivelDe(c) ? <CornerDownRight size={14} className="mr-2 inline align-[-2px]" aria-label={t('subtipo', 'Subtipo')} /> : null}
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
