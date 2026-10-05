/**
 * IaPage — Auxiliares ▸ Claves de IA (05/10/2026).
 *
 * Proveedores de IA para leer facturas: Anthropic, OpenAI y Google.
 * Tabla s_ia. La clave se guarda cifrada; aquí se ve con el ojo (cada vez que
 * se muestra queda en la auditoría) y se puede cambiar. Solo roles 3 y 4.
 *
 * API: /ia/proveedores · /ia/modelos · /ia/proveedores/:id/clave · /ia/proveedores/:id/probar
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, Eye, EyeOff, Pencil, Trash2, PlugZap, Check, ExternalLink } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import {
  CabeceraPagina, Panel, CabeceraPanel, Campo, Casilla, AvisoError, AvisoOk, SinDato, CLASE_INPUT, TablaTema, claseFila, TD, BotonFila, FilaVacia,
} from '../../components/UI/TemaPagina';

async function pedir(url, opciones = {}) {
  const r = await apiFetch(url, { ...opciones, headers: { ...authHeaders(), ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) } });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.errors?.[0]?.message || b.message || `Error ${r.status}`);
  return b;
}

const PROVEEDORES = [['ANTHROPIC', 'Anthropic (Claude)'], ['OPENAI', 'OpenAI (GPT)'], ['GOOGLE', 'Google (Gemini)']];
const VACIO = { nombre: '', proveedor: 'GOOGLE', modelo: 'gemini-3.5-flash', url_claves: 'https://aistudio.google.com/apikey', clave: '', activo: true, por_defecto: false };
const fechaHora = (v) => (v ? new Date(v).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : null);

export default function IaPage() {
  const { t } = useTmTr('Ia');
  const [lista, setLista] = useState([]);
  const [modelos, setModelos] = useState({});
  const [urls, setUrls] = useState({});
  const [form, setForm] = useState(null);
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    try { setLista((await pedir('/ia/proveedores')).data || []); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { cargar(); pedir('/ia/modelos').then((b) => { setModelos(b.data || {}); setUrls(b.urls || {}); }).catch(() => {}); }, [cargar]);

  const nuevo = () => { setError(''); setAviso(''); setVerClave(false); setForm({ ...VACIO }); };
  const editar = (p) => {
    setError(''); setAviso(''); setVerClave(false);
    setForm({ id: p.id, nombre: p.nombre, proveedor: p.proveedor, modelo: p.modelo, url_claves: p.url_claves || '', clave: '', claveCargada: false, clave_final: p.clave_final, activo: Boolean(p.activo), por_defecto: Boolean(p.por_defecto) });
  };

  // El ojo: la primera vez trae la clave del servidor (queda en la auditoría).
  const alternarClave = async () => {
    if (!verClave && form.id && !form.claveCargada && !form.clave) {
      try {
        const { data } = await pedir(`/ia/proveedores/${form.id}/clave`);
        setForm((f) => ({ ...f, clave: data.clave, claveCargada: true, claveOriginal: data.clave }));
      } catch (e) { setError(e.message); return; }
    }
    setVerClave((v) => !v);
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setOcupado('guardar'); setError('');
    try {
      const { id, claveCargada, claveOriginal, clave_final: _f, ...datos } = form;
      // Si solo se ha mirado la clave, no se reenvía.
      if (claveCargada && datos.clave === claveOriginal) delete datos.clave;
      if (!datos.clave) delete datos.clave;
      await pedir(id ? `/ia/proveedores/${id}` : '/ia/proveedores', { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
      setForm(null); setAviso(t('guardado', 'Guardado.')); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(null); }
  };

  const borrar = async (p) => {
    if (!window.confirm(t('confirmar_borrar', '¿Borrar «{nombre}»?').replace('{nombre}', p.nombre))) return;
    try { await pedir(`/ia/proveedores/${p.id}`, { method: 'DELETE' }); await cargar(); } catch (e) { setError(e.message); }
  };

  const probar = async (p) => {
    setOcupado(`probar${p.id}`); setError(''); setAviso('');
    try {
      const { data } = await pedir(`/ia/proveedores/${p.id}/probar`, { method: 'POST' });
      if (data.ok) setAviso(`${p.nombre}: ${data.mensaje}`); else setError(`${p.nombre}: ${data.mensaje}`);
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(null); }
  };

  const fc = (k) => ({ value: form?.[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  const sugeridos = modelos[form?.proveedor] || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CabeceraPagina icono={<Sparkles size={24} />} titulo={t('titulo', 'Claves de IA')}
        subtitulo={t('subtitulo', 'Proveedores de IA para leer facturas: modelo, clave (se guarda cifrada) y dónde se crea.')} />
      <AvisoError>{error}</AvisoError>
      <AvisoOk>{aviso}</AvisoOk>

      {form && (
        <Panel className="p-5">
          <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-6">
            <Campo etiqueta={t('nombre', 'Nombre')} ancho="sm:col-span-2"><input required maxLength={80} autoFocus {...fc('nombre')} placeholder="Anthropic Haiku facturas" className={CLASE_INPUT} /></Campo>
            <Campo etiqueta={t('proveedor', 'Proveedor')} ancho="sm:col-span-2">
              <select value={form.proveedor} onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value, modelo: (modelos[e.target.value] || [''])[0], url_claves: urls[e.target.value] || f.url_claves }))} className={CLASE_INPUT}>
                {PROVEEDORES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select>
            </Campo>
            <Campo etiqueta={t('modelo', 'Modelo')} ancho="sm:col-span-2">
              <input required maxLength={100} list="ia-modelos" {...fc('modelo')} className={`${CLASE_INPUT} font-mono`} />
              <datalist id="ia-modelos">{sugeridos.map((m) => <option key={m} value={m} />)}</datalist>
            </Campo>
            <Campo etiqueta={t('url_claves', 'Dónde se crean las claves (URL)')} ancho="sm:col-span-6">
              <div className="flex gap-2">
                <input type="url" maxLength={300} {...fc('url_claves')} placeholder="https://…" className={`${CLASE_INPUT} font-mono`} />
                {form.url_claves && (
                  <a href={form.url_claves} target="_blank" rel="noopener noreferrer" title={t('abrir', 'Abrir')} aria-label={t('abrir', 'Abrir')}
                    className="grid place-items-center rounded-xl border border-border px-3 hover:bg-surface-hover hover:text-on-surface-hover"><ExternalLink size={18} /></a>
                )}
              </div>
            </Campo>
            <Campo etiqueta={t('clave', 'Clave API')} ancho="sm:col-span-4">
              <div className="flex gap-2">
                <input type={verClave ? 'text' : 'password'} autoComplete="new-password" {...fc('clave')}
                  placeholder={form.id ? `${t('sin_cambios', 'Sin cambios')} ${form.clave_final || ''}` : ''} className={`${CLASE_INPUT} font-mono`} />
                <button type="button" onClick={alternarClave} aria-label={verClave ? t('ocultar', 'Ocultar') : t('ver', 'Ver')} title={verClave ? t('ocultar', 'Ocultar') : t('ver', 'Ver')}
                  className="rounded-xl border border-border px-3 hover:bg-surface-hover hover:text-on-surface-hover">{verClave ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </Campo>
            <div className="flex items-end gap-6 pb-2 sm:col-span-2">
              <Casilla etiqueta={t('activa', 'Activa')} checked={form.activo} onChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
              <Casilla etiqueta={t('por_defecto', 'Por defecto')} checked={form.por_defecto} onChange={(v) => setForm((f) => ({ ...f, por_defecto: v }))} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-6">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>{t('cancelar', 'Cancelar')}</Button>
              <Button type="submit" loading={ocupado === 'guardar'} leftIcon={<Check size={16} />}>{t('guardar', 'Guardar')}</Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel className="overflow-hidden">
        <CabeceraPanel anadir={!form ? { texto: t('nuevo', 'Nuevo proveedor de IA'), onClick: nuevo } : null}
          icono={<Sparkles size={20} />} titulo={t('lista', 'Proveedores')} contador={`${lista.length}`} />
        <div className="p-3">
          <TablaTema columnas={[
            { texto: '' }, { texto: t('nombre', 'Nombre') }, { texto: t('proveedor', 'Proveedor') }, { texto: t('modelo', 'Modelo') },
            { texto: t('clave', 'Clave API') }, { texto: t('url_corta', 'Web') }, { texto: t('estado', 'Estado') }, { texto: t('ultima_prueba', 'Última prueba') }, { texto: t('usos', 'Usos'), derecha: true },
          ]}>
            {lista.length === 0 && <FilaVacia columnas={9}>{t('vacio', 'Todavía no hay ninguno. Pulsa «+» para añadir el primero.')}</FilaVacia>}
            {lista.map((p, i) => (
              <tr key={p.id} className={claseFila(i)}>
                <td className={`${TD} whitespace-nowrap`}>
                  <BotonFila icono={<Pencil size={15} />} titulo={t('editar', 'Editar')} onClick={() => editar(p)} />
                  <BotonFila icono={<PlugZap size={15} />} titulo={ocupado === `probar${p.id}` ? t('probando', 'Probando…') : t('probar', 'Probar')} onClick={() => probar(p)} disabled={Boolean(ocupado)} />
                  <BotonFila icono={<Trash2 size={15} />} titulo={t('borrar', 'Borrar')} onClick={() => borrar(p)} />
                </td>
                <td className={TD}><span className="font-black">{p.nombre}</span>{Number(p.por_defecto) ? ` · ${t('por_defecto', 'Por defecto')}` : ''}</td>
                <td className={TD}>{(PROVEEDORES.find(([v]) => v === p.proveedor) || [null, p.proveedor])[1]}</td>
                <td className={`${TD} font-mono text-xs`}>{p.modelo}</td>
                <td className={`${TD} font-mono`}>{p.tiene_clave ? p.clave_final : <SinDato />}</td>
                <td className={TD}>{p.url_claves ? <a href={p.url_claves} target="_blank" rel="noopener noreferrer" title={p.url_claves} aria-label={t('abrir', 'Abrir')} className="inline-flex rounded-md p-1 hover:bg-surface-hover hover:text-on-surface-hover"><ExternalLink size={15} /></a> : <SinDato />}</td>
                <td className={TD}>{Number(p.activo) ? t('activa', 'Activa') : t('inactiva', 'Inactiva')}</td>
                <td className={TD}>{p.ultima_prueba ? `${fechaHora(p.ultima_prueba)} · ${Number(p.ultima_prueba_ok) ? '✔' : '✖'}` : <SinDato />}{p.ultimo_mensaje && !Number(p.ultima_prueba_ok) ? <div className="text-xs">{p.ultimo_mensaje}</div> : null}</td>
                <td className={`${TD} text-right font-mono`}>{p.usos}</td>
              </tr>
            ))}
          </TablaTema>
        </div>
      </Panel>
    </div>
  );
}
