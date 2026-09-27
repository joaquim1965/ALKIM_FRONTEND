/**
 * TareasPage.jsx — Administración ▸ Tareas programadas (27/09/2026)
 *
 * Solo superadmin y sysadmin. Lista las tareas que el backend ejecuta solo
 * (informe semanal del sábado, comprobación de copias…), con su horario, la
 * próxima y la última ejecución, y permite crearlas, editarlas, borrarlas,
 * lanzarlas en el momento y ver su historial.
 *
 * Los tipos son un catálogo cerrado que define el backend
 * (services/tareas/catalogo.js): aquí no se escribe código ni comandos.
 * Las copias de MySQL las hace el cron del servidor; esta página solo enseña
 * cuándo fue la última.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Play, History, Pencil, Trash2, Plus, X as CloseIcon, Save, DatabaseBackup } from 'lucide-react';
import Button from '../../components/UI/Button';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

// Como el backend: 1 = lunes … 7 = domingo.
const DIAS = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_ES = [null, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const fecha = (v) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const pedir = async (ruta, opciones = {}) => {
    const r = await apiFetch(ruta, { ...opciones, headers: authHeaders() });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok || cuerpo.success === false) throw new Error(cuerpo.message || `Error ${r.status}`);
    return cuerpo.data;
};

const Estado = ({ estado }) => {
    const { t } = useTmTr('Tareas');
    if (!estado) return <span className="text-on-surface1">—</span>;
    const cls = estado === 'ok' ? 'text-success' : estado === 'error' ? 'text-danger' : 'text-warning';
    const txt = estado === 'ok' ? t('estado_ok', 'Correcta') : estado === 'error' ? t('estado_error', 'Error') : t('estado_en_curso', 'En curso');
    return <span className={`font-semibold ${cls}`}>{txt}</span>;
};

/* ── Formulario de alta / edición ─────────────────────────────────────── */
const Formulario = ({ tarea, catalogo, onCerrar, onGuardado }) => {
    const { t } = useTmTr('Tareas');
    const nueva = !tarea;
    const [tipo, setTipo] = useState(tarea?.tipo || catalogo[0]?.tipo || '');
    const def = catalogo.find((c) => c.tipo === tipo);
    const base = tarea || { nombre: def?.nombre || '', ...(def?.horarioPorDefecto || {}), parametros: {}, activo: true };
    const [datos, setDatos] = useState({
        nombre: base.nombre || '',
        frecuencia: base.frecuencia || 'semanal',
        hora: base.hora || '09:00',
        dia_semana: base.dia_semana ?? 6,
        dia_mes: base.dia_mes ?? 1,
        cada_horas: base.cada_horas ?? 6,
        activo: base.activo !== false,
        parametros: { ...(base.parametros || {}) },
    });
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const cambiarTipo = (nuevoTipo) => {
        setTipo(nuevoTipo);
        const d = catalogo.find((c) => c.tipo === nuevoTipo);
        if (d) setDatos((x) => ({ ...x, nombre: d.nombre, ...(d.horarioPorDefecto || {}), parametros: {} }));
    };
    const poner = (campo, valor) => setDatos((x) => ({ ...x, [campo]: valor }));
    const ponerParam = (clave, valor) => setDatos((x) => ({ ...x, parametros: { ...x.parametros, [clave]: valor } }));

    const guardar = async () => {
        setError('');
        setGuardando(true);
        try {
            await pedir(nueva ? '/tareas' : `/tareas/${tarea.id}`, {
                method: nueva ? 'POST' : 'PUT',
                body: JSON.stringify({ ...datos, tipo }),
            });
            onGuardado();
        } catch (e) {
            setError(e.message);
        } finally {
            setGuardando(false);
        }
    };

    const campo = 'w-full px-3 py-2 rounded-md bg-surface2 text-on-surface2 border border-border focus:outline-none focus:border-primary';
    const etiqueta = 'block text-sm font-semibold mb-1 text-on-surface1';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-modal-backdrop/80 p-4" onClick={onCerrar}>
            <div className="w-full max-w-lg rounded-xl bg-surface1 text-on-surface1 border border-border shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">{nueva ? t('nueva_tarea', 'Nueva tarea') : t('editar_tarea', 'Editar tarea')}</h2>
                    <button type="button" onClick={onCerrar} title={t('cerrar', 'Cerrar')}><CloseIcon size={20} /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className={etiqueta}>{t('tipo', 'Tipo')}</label>
                        <select className={campo} value={tipo} disabled={!nueva} onChange={(e) => cambiarTipo(e.target.value)}>
                            {catalogo.map((c) => <option key={c.tipo} value={c.tipo}>{c.nombre}</option>)}
                        </select>
                        {def?.descripcion && <p className="text-sm mt-1 text-on-surface1">{def.descripcion}</p>}
                    </div>
                    <div>
                        <label className={etiqueta}>{t('nombre', 'Nombre')}</label>
                        <input className={campo} value={datos.nombre} maxLength={120} onChange={(e) => poner('nombre', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={etiqueta}>{t('frecuencia', 'Frecuencia')}</label>
                            <select className={campo} value={datos.frecuencia} onChange={(e) => poner('frecuencia', e.target.value)}>
                                <option value="diaria">{t('diaria', 'Diaria')}</option>
                                <option value="semanal">{t('semanal', 'Semanal')}</option>
                                <option value="mensual">{t('mensual', 'Mensual')}</option>
                                <option value="horas">{t('cada_n_horas', 'Cada N horas')}</option>
                            </select>
                        </div>
                        {datos.frecuencia !== 'horas' ? (
                            <div>
                                <label className={etiqueta}>{t('hora', 'Hora')}</label>
                                <input type="time" className={campo} value={datos.hora} onChange={(e) => poner('hora', e.target.value)} />
                            </div>
                        ) : (
                            <div>
                                <label className={etiqueta}>{t('cada_horas', 'Cada (horas)')}</label>
                                <input type="number" min={1} max={168} className={campo} value={datos.cada_horas}
                                    onChange={(e) => poner('cada_horas', e.target.value)} />
                            </div>
                        )}
                    </div>
                    {datos.frecuencia === 'semanal' && (
                        <div>
                            <label className={etiqueta}>{t('dia_semana', 'Día de la semana')}</label>
                            <select className={campo} value={datos.dia_semana} onChange={(e) => poner('dia_semana', Number(e.target.value))}>
                                {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{t(DIAS[d], DIAS_ES[d])}</option>)}
                            </select>
                        </div>
                    )}
                    {datos.frecuencia === 'mensual' && (
                        <div>
                            <label className={etiqueta}>{t('dia_mes', 'Día del mes (1-28)')}</label>
                            <input type="number" min={1} max={28} className={campo} value={datos.dia_mes}
                                onChange={(e) => poner('dia_mes', e.target.value)} />
                        </div>
                    )}
                    {(def?.parametros || []).map((p) => (
                        <div key={p.clave}>
                            <label className={etiqueta}>{p.etiqueta}{p.obligatorio ? ' *' : ''}</label>
                            <input className={campo} type={p.tipo === 'numero' ? 'number' : 'text'}
                                value={datos.parametros[p.clave] ?? ''} placeholder={p.porDefecto !== undefined ? String(p.porDefecto) : ''}
                                onChange={(e) => ponerParam(p.clave, e.target.value)} />
                        </div>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={datos.activo} onChange={(e) => poner('activo', e.target.checked)} />
                        <span>{t('activa', 'Activa')}</span>
                    </label>
                    {error && <p className="text-danger font-semibold">{error}</p>}
                </div>

                <div className="flex justify-end gap-2 mt-5">
                    <Button variant="secondary" onClick={onCerrar}>{t('cancelar', 'Cancelar')}</Button>
                    <Button onClick={guardar} loading={guardando}><Save size={16} className="mr-1" />{t('guardar', 'Guardar')}</Button>
                </div>
            </div>
        </div>
    );
};

/* ── Historial de una tarea ───────────────────────────────────────────── */
const Historial = ({ tarea, onCerrar }) => {
    const { t } = useTmTr('Tareas');
    const [filas, setFilas] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        pedir(`/tareas/${tarea.id}/historial`).then(setFilas).catch((e) => setError(e.message));
    }, [tarea.id]);
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-modal-backdrop/80 p-4" onClick={onCerrar}>
            <div className="w-full max-w-3xl rounded-xl bg-surface1 text-on-surface1 border border-border shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">{t('historial', 'Historial')} · {tarea.nombre}</h2>
                    <button type="button" onClick={onCerrar} title={t('cerrar', 'Cerrar')}><CloseIcon size={20} /></button>
                </div>
                {error && <p className="text-danger">{error}</p>}
                {!filas && !error && <p>{t('cargando', 'Cargando…')}</p>}
                {filas && filas.length === 0 && <p>{t('sin_ejecuciones', 'Todavía no se ha ejecutado.')}</p>}
                {filas && filas.length > 0 && (
                    <table className="w-full text-sm">
                        <thead className="bg-table-header text-on-table-header">
                            <tr className="border-b border-border text-left">
                                <th className="py-1 pr-2">{t('inicio', 'Inicio')}</th>
                                <th className="py-1 pr-2">{t('estado', 'Estado')}</th>
                                <th className="py-1 pr-2 text-right">{t('duracion', 'Duración')}</th>
                                <th className="py-1 pr-2">{t('lanzada_por', 'Lanzada por')}</th>
                                <th className="py-1">{t('mensaje', 'Mensaje')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((f, i) => (
                                <tr key={f.id} className={`border-b border-border align-top ${i % 2 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'}`}>
                                    <td className="py-1 pr-2 whitespace-nowrap">{fecha(f.inicio)}</td>
                                    <td className="py-1 pr-2"><Estado estado={f.estado} /></td>
                                    <td className="py-1 pr-2 text-right whitespace-nowrap">{f.duracion_ms != null ? `${(f.duracion_ms / 1000).toFixed(1)} s` : '—'}</td>
                                    <td className="py-1 pr-2">{f.lanzado_por_nombre || t('programador', 'Programador')}</td>
                                    <td className="py-1 break-words">{f.mensaje}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

/* ── Página ───────────────────────────────────────────────────────────── */
const TareasPage = () => {
    const { t } = useTmTr('Tareas');
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [editando, setEditando] = useState(undefined); // undefined = cerrado, null = nueva
    const [viendo, setViendo] = useState(null);
    const [ejecutando, setEjecutando] = useState(null);

    const cargar = useCallback(() => {
        pedir('/tareas').then((d) => { setDatos(d); setError(''); }).catch((e) => setError(e.message));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const ejecutar = async (tarea) => {
        setEjecutando(tarea.id);
        setAviso('');
        try {
            const r = await pedir(`/tareas/${tarea.id}/ejecutar`, { method: 'POST' });
            setAviso(`${tarea.nombre}: ${r.estado === 'ok' ? '✔' : '✖'} ${r.mensaje}`);
        } catch (e) {
            setAviso(`${tarea.nombre}: ✖ ${e.message}`);
        } finally {
            setEjecutando(null);
            cargar();
        }
    };

    const borrar = async (tarea) => {
        if (!window.confirm(t('confirmar_borrar', '¿Borrar la tarea «{nombre}» y su historial?').replace('{nombre}', tarea.nombre))) return;
        try { await pedir(`/tareas/${tarea.id}`, { method: 'DELETE' }); cargar(); } catch (e) { setAviso(e.message); }
    };

    const copias = datos?.copias;
    const horasCopia = copias?.ultima ? (Date.now() - new Date(copias.ultima.fecha).getTime()) / 3600000 : null;

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto text-on-surface1">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <CalendarClock size={28} className="text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">{t('titulo', 'Tareas programadas')}</h1>
                        <p className="text-sm">{t('subtitulo', 'Lo que el servidor hace solo: informes, avisos y comprobaciones.')}</p>
                    </div>
                </div>
                <Button onClick={() => setEditando(null)} disabled={!datos}><Plus size={16} className="mr-1" />{t('nueva', 'Nueva')}</Button>
            </div>

            {datos && !datos.programadorActivo && (
                <p className="mb-3 p-3 rounded-md border border-warning text-warning">
                    {t('programador_apagado', 'En este equipo el programador está apagado (solo funciona en el servidor). «Ejecutar ahora» sí funciona.')}
                </p>
            )}
            {error && <p className="mb-3 text-danger font-semibold">{error}</p>}
            {aviso && <p className="mb-3 p-3 rounded-md border border-border break-words">{aviso}</p>}

            {/* Copias de seguridad (las hace el cron del servidor) */}
            {copias && (
                <div className="mb-4 p-4 rounded-xl border border-border bg-surface1 flex items-start gap-3">
                    <DatabaseBackup size={22} className="text-primary mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold">{t('copias_titulo', 'Copias de seguridad de la base de datos')}</p>
                        {!copias.disponible && <p>{t('copias_no_disponible', 'Aquí no hay registro de copias (solo existe en el servidor).')}</p>}
                        {copias.disponible && !copias.ultima && <p className="text-danger">{t('copias_ninguna', 'No consta ninguna copia correcta.')}</p>}
                        {copias.disponible && copias.ultima && (
                            <p>
                                {t('copias_ultima', 'Última correcta')}: <span className={horasCopia > 30 ? 'text-danger font-semibold' : 'text-success font-semibold'}>{fecha(copias.ultima.fecha)}</span>
                                {' · '}{copias.ultima.fichero}{' · '}{t('copias_semana', 'en 7 días')}: {copias.semana}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {!datos && !error && <p>{t('cargando', 'Cargando…')}</p>}
            {datos && datos.tareas.length === 0 && <p>{t('sin_tareas', 'No hay tareas. Crea una con «Nueva».')}</p>}
            {datos && datos.tareas.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-table-header text-on-table-header">
                            <tr className="text-left">
                                <th className="p-2">{t('nombre', 'Nombre')}</th>
                                <th className="p-2">{t('horario', 'Horario')}</th>
                                <th className="p-2">{t('proxima', 'Próxima')}</th>
                                <th className="p-2">{t('ultima', 'Última')}</th>
                                <th className="p-2">{t('estado', 'Estado')}</th>
                                <th className="p-2 text-right">{t('acciones', 'Acciones')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.tareas.map((tarea, i) => (
                                <tr key={tarea.id} className={`border-t border-border align-top ${i % 2 ? 'bg-table-row-striped text-on-table-row-striped' : 'bg-table-row text-on-table-row'} ${tarea.activo ? '' : 'opacity-60'}`}>
                                    <td className="p-2">
                                        <div className="font-semibold">{tarea.nombre}</div>
                                        {!tarea.activo && <div className="text-warning text-xs">{t('desactivada', 'Desactivada')}</div>}
                                    </td>
                                    <td className="p-2">{tarea.horario}</td>
                                    <td className="p-2 whitespace-nowrap">{tarea.activo ? fecha(tarea.proxima_ejecucion) : '—'}</td>
                                    <td className="p-2 whitespace-nowrap">{fecha(tarea.ultima_ejecucion)}</td>
                                    <td className="p-2 max-w-xs">
                                        <Estado estado={tarea.ultimo_estado} />
                                        {tarea.ultimo_mensaje && <div className="text-xs break-words" title={tarea.ultimo_mensaje}>{tarea.ultimo_mensaje.slice(0, 120)}</div>}
                                    </td>
                                    <td className="p-2">
                                        <div className="flex justify-end gap-1">
                                            <button type="button" className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-40"
                                                title={t('ejecutar_ahora', 'Ejecutar ahora')} disabled={ejecutando !== null}
                                                onClick={() => ejecutar(tarea)}>
                                                <Play size={18} className={ejecutando === tarea.id ? 'animate-pulse' : ''} />
                                            </button>
                                            <button type="button" className="p-1.5 rounded hover:bg-surface-hover" title={t('historial', 'Historial')}
                                                onClick={() => setViendo(tarea)}><History size={18} /></button>
                                            <button type="button" className="p-1.5 rounded hover:bg-surface-hover" title={t('editar', 'Editar')}
                                                onClick={() => setEditando(tarea)}><Pencil size={18} /></button>
                                            <button type="button" className="p-1.5 rounded hover:bg-surface-hover" title={t('borrar', 'Borrar')}
                                                onClick={() => borrar(tarea)}><Trash2 size={18} className="text-danger" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editando !== undefined && datos && (
                <Formulario tarea={editando} catalogo={datos.catalogo}
                    onCerrar={() => setEditando(undefined)} onGuardado={() => { setEditando(undefined); cargar(); }} />
            )}
            {viendo && <Historial tarea={viendo} onCerrar={() => setViendo(null)} />}
        </div>
    );
};

export default TareasPage;
