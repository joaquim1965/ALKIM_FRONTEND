import React, { useEffect, useState } from 'react';
import { Landmark, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Spinner } from '../../../components/UI';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

/**
 * Dar de alta una cuenta.
 *
 * Antes, «Agregar cuenta» daba por hecho dos cosas a la vez: que el banco era
 * nuevo, y que había que grabar la descarga en ese momento. Empezaba pidiendo
 * la dirección web y abría el navegador.
 *
 * Lo normal es justo lo contrario: la cuenta nueva suele ser la **segunda de un
 * banco que ya está**, cuyo guion de descarga ya existe. No hay nada que grabar
 * ni nada que descargar; solo hace falta apuntar la cuenta (23/08/2026).
 *
 * De ahí las dos preguntas, en este orden:
 *
 *   1. ¿Es de uno de tus bancos, o de uno nuevo?
 *   2. Los datos: la cuenta siempre; el banco solo si es nuevo.
 *
 * Grabar el guion y descargar siguen teniendo su botón en cada fila, y se hacen
 * cuando toque. Separarlos es lo que permite dar de alta tres cuentas seguidas
 * sin abrir el navegador ni una vez.
 */
const AltaCuenta = ({ onClose, onCreada }) => {
  const { t } = useTmTr('AltaCuenta');
  const [bancos, setBancos] = useState(null);
  const [modo, setModo] = useState(null);          // 'existente' | 'nuevo'
  const [bancoId, setBancoId] = useState('');
  const [form, setForm] = useState({ nombreBanco: '', abreviatura: '', url: '', bicSwift: '', alias: '', iban: '' });
  const [guardando, setGuardando] = useState(false);
  // Cuentas del banco elegido que aún no tienen descarga: se eligen, no se
  // teclean. Ver el comentario del bloque «existente» más abajo.
  const [libres, setLibres] = useState(null);
  const [cuentaId, setCuentaId] = useState('');
  const [error, setError] = useState(null);
  // De quién es la cuenta. Es lo primero que se pregunta al crearla porque una
  // cuenta sin empresa no aparece en los listados que filtran por empresa y hay
  // que ir a corregirla a otra pantalla. Por defecto, la empresa activa.
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState(() => {
    const activa = localStorage.getItem('empresaActiva');
    return activa && activa !== 'todas' ? activa : '';
  });

  useEffect(() => {
    (async () => {
      try {
        const respuesta = await apiFetch('/crawler/bancos', { headers: authHeaders() });
        const res = await respuesta.json();
        setBancos(res.success ? res.data : []);
        if (res.success && res.data.length) setBancoId(String(res.data[0].id));
      } catch {
        setBancos([]);
      }
    })();
    (async () => {
      try {
        const respuesta = await apiFetch('/companies/mine', { headers: authHeaders() });
        const res = await respuesta.json();
        const lista = res?.data || [];
        setEmpresas(lista);
        // Con una sola empresa no hay nada que elegir: se da por puesta.
        setEmpresaId((actual) => actual || (lista.length === 1 ? String(lista[0].id) : ''));
      } catch {
        setEmpresas([]);
      }
    })();
  }, []);

  const cambiar = (campo) => (e) => setForm((p) => ({ ...p, [campo]: e.target.value }));

  /**
   * Banco que ya está: se cargan sus cuentas sin descarga.
   *
   * Casi siempre la cuenta **ya existe** en «Bancos, cuentas y tarjetas» —con
   * su IBAN, sus titulares y sus tarjetas— y lo único que le falta es el guion
   * de descarga. Pedir otra vez el IBAN a mano invita a teclearlo mal y acabar
   * con la misma cuenta dos veces.
   */
  const elegirExistente = async () => {
    setModo('existente');
    setLibres(null);
    setCuentaId('');
    try {
      const respuesta = await apiFetch(`/crawler/cuentas-libres?bancoId=${bancoId}`, { headers: authHeaders() });
      const res = await respuesta.json();
      const lista = res.success ? res.data : [];
      setLibres(lista);
      if (lista.length) setCuentaId(String(lista[0].id));
    } catch {
      setLibres([]);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const cuerpo = modo === 'existente'
        // La cuenta ya existe: solo le falta la descarga, y su IBAN ya lo
        // tenemos. Volver a pedirlo solo puede introducir una errata.
        ? { cuentaId: Number(cuentaId) }
        : {
          empresaId: Number(empresaId) || null,
          nombreBanco: form.nombreBanco,
          abreviatura: form.abreviatura,
          url: form.url,
          bicSwift: form.bicSwift,
          alias: form.alias,
          iban: form.iban,
        };
      const respuesta = await apiFetch('/crawler/cuentas', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const res = await respuesta.json();
      if (!res.success) throw new Error(res.message || t('create_error'));
      onCreada(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const etiqueta = 'block text-[11px] font-black uppercase tracking-widest text-on-surface1';
  const campo = 'input-base mt-1 w-full rounded-xl border-border bg-surface1 px-4 py-2 text-sm font-bold normal-case tracking-normal text-on-surface1';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-modal-backdrop/80 p-4" role="dialog" aria-modal="true" aria-labelledby="alta-cuenta-title">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-y-auto rounded-3xl border border-border bg-surface2 p-6 shadow-2xl custom-scrollbar">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
            <Landmark size={22} />
          </div>
          <div>
            <h2 id="alta-cuenta-title" className="text-xl font-black tracking-tight text-on-background">{t('title')}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-destructive bg-surface1 px-4 py-2 text-sm font-bold text-destructive-text">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        {/* ── Pregunta 1: ¿de quién es la cuenta? ── */}
        {modo === null && (
          <div className="space-y-4">
            {bancos === null && <div className="flex justify-center p-6"><Spinner size="lg" /></div>}

            {bancos !== null && bancos.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface1 p-4">
                <p className={etiqueta}>{t('existing_bank_label')}</p>
                <div className="mt-2 flex gap-2">
                  <select
                    value={bancoId}
                    onChange={(e) => setBancoId(e.target.value)}
                    className="input-base w-full rounded-xl border-border bg-surface2 px-4 py-2 text-sm font-bold text-on-surface1"
                  >
                    {bancos.map((banco) => (
                      <option key={banco.id} value={banco.id}>
                        {t(banco.cuentas === 1 ? 'bank_option_one' : 'bank_option_many')
                          .replace('{banco}', `${banco.nombre}${banco.abreviatura ? ` (${banco.abreviatura})` : ''}`)
                          .replace('{n}', banco.cuentas)}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary" onClick={() => elegirExistente()}>{t('existing_button')}</Button>
                </div>
                <p className="mt-2 text-xs font-bold text-on-surface2">
                  {t('existing_hint')}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-surface1 p-4">
              <p className={etiqueta}>{t('new_bank_label')}</p>
              <div className="mt-2">
                <Button variant="secondary" onClick={() => setModo('nuevo')}>
                  <Plus size={16} /> {t('new_bank_button')}
                </Button>
              </div>
              <p className="mt-2 text-xs font-bold text-on-surface2">
                {t('new_bank_hint')}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            </div>
          </div>
        )}

        {/* ── Pregunta 2: los datos ── */}
        {modo !== null && (
          <form onSubmit={guardar} className="space-y-4">
            {modo === 'existente' ? (
              <>
                <p className="rounded-2xl border border-border bg-surface1 px-4 py-3 text-sm font-bold text-on-surface1">
                  {t('selected_bank').replace('{banco}', bancos?.find((b) => String(b.id) === String(bancoId))?.nombre || '')}
                </p>

                {libres === null && <div className="flex justify-center p-4"><Spinner size="md" /></div>}

                {libres !== null && libres.length > 0 && (
                  <label className={etiqueta}>
                    {t('account_field')}
                    <select
                      value={cuentaId}
                      onChange={(e) => setCuentaId(e.target.value)}
                      className="input-base mt-1 w-full rounded-xl border-border bg-surface1 px-4 py-2 text-sm font-bold normal-case tracking-normal text-on-surface1"
                    >
                      {libres.map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {cuenta.alias} · {cuenta.iban}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-on-surface2">
                      {t('account_field_hint')}
                    </span>
                  </label>
                )}

                {/* Un sitio para cada cosa (decisión del usuario, 23/08/2026).
                    Las cuentas se crean en «Bancos, cuentas y tarjetas», con su
                    IBAN, sus titulares y sus tarjetas; aquí solo se les añade la
                    descarga. Antes había una opción «otra cuenta (escribirla)»
                    que abría un segundo camino para lo mismo. */}
                {libres !== null && libres.length === 0 && (
                  <p className="rounded-2xl border border-border bg-surface1 px-4 py-3 text-xs font-bold text-on-surface2">
                    {t('no_free_accounts')}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* La empresa va la primera: es de quien es todo lo demás. Una
                    cuenta sin empresa se queda fuera de los listados que
                    filtran por empresa y hay que corregirla en otra pantalla. */}
                <label className={etiqueta}>
                  {t('company_field')}
                  <select
                    required value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    className={campo}
                  >
                    <option value="">{t('company_placeholder')}</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-on-surface2">
                    {t('company_field_hint')}
                  </span>
                </label>

                <label className={etiqueta}>
                  {t('bank_name_field')}
                  <input required maxLength={100} value={form.nombreBanco} onChange={cambiar('nombreBanco')} className={campo} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={etiqueta}>
                    {t('abbreviation_field')}
                    <input
                      required maxLength={10} value={form.abreviatura}
                      onChange={(e) => setForm((p) => ({ ...p, abreviatura: e.target.value.toUpperCase() }))}
                      className={`${campo} font-mono`}
                    />
                    <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-on-surface2">
                      {t('abbreviation_field_hint')}
                    </span>
                  </label>
                  <label className={etiqueta}>
                    {t('bic_field')}
                    <input
                      maxLength={11} value={form.bicSwift}
                      onChange={(e) => setForm((p) => ({ ...p, bicSwift: e.target.value.toUpperCase() }))}
                      className={`${campo} font-mono`}
                    />
                  </label>
                </div>
                <label className={etiqueta}>
                  {t('bank_url_field')}
                  <input
                    required type="url" maxLength={255} value={form.url}
                    onChange={cambiar('url')} placeholder={t('bank_url_placeholder')}
                    className={`${campo} font-mono`}
                  />
                  <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-on-surface2">
                    {t('bank_url_field_hint')}
                  </span>
                </label>
              </>
            )}

            {/* Solo al dar de alta un banco nuevo. En un banco que ya está, la
                cuenta se elige de la lista: crearla es cosa de «Bancos, cuentas
                y tarjetas». */}
            {modo === 'nuevo' && (
              <>
                <label className={etiqueta}>
                  {t('account_name_field')}
                  <input
                    required autoComplete="off" maxLength={100}
                    value={form.alias} onChange={cambiar('alias')} className={campo}
                  />
                </label>

                <label className={etiqueta}>
                  {t('iban_field')}
                  <input
                    required maxLength={34} autoComplete="off" value={form.iban}
                    onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value.toUpperCase() }))}
                    placeholder={t('iban_placeholder')}
                    className={`${campo} font-mono`}
                  />
                </label>
              </>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setModo(null); setError(null); }}>{t('back')}</Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                <Button
                  type="submit" variant="primary"
                  disabled={guardando || (modo === 'existente' && !cuentaId)}
                >
                  {guardando ? <Spinner size="sm" /> : <CheckCircle size={16} />} {t('create_account')}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AltaCuenta;
