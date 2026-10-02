/**
 * BancosCuentasPage.jsx — Tesorería ▸ Bancos, cuentas y tarjetas
 *
 * Maestro-detalle en tres alturas: arriba el banco (selector + ficha), en medio
 * sus cuentas, y al seleccionar una, sus tarjetas debajo.
 *
 * De las tarjetas **no se guardan el número completo, ni el CVV, ni el PIN**.
 * Ver la migración `2026.08.22 - alias, BIN y limite en ban_card.sql` para el
 * razonamiento; el resumen es que el número viaja por todas partes y lo único
 * que impide usarlo es que le falte el CVV, así que guardar los dos juntos
 * elimina esa separación —y cifrarlos no la devuelve, porque la aplicación
 * tiene que poder descifrarlos para enseñártelos—. eferencia_gestor` dice
 * dónde está la ficha completa, que es un gestor de contraseñas. Sustituye a las pestañas «Entidades Bancarias» y
 * «Cuentas Corrientes» de Contabilidad ▸ Bancos, que mostraban las dos tablas
 * por separado y obligaban a recordar de qué banco era cada cuenta.
 *
 * Vive en Tesorería porque es el dato maestro del que dependen Extractos,
 * Movimientos, Autodescargar e Historial: dar de alta la cuenta que se va a
 * descargar y descargarla eran, hasta ahora, dos módulos distintos.
 *
 * El lenguaje visual es el de `/settings` (ver CRITERIOS_UI_LISTADOS.md): la
 * cabecera con distintivo, el panel del selector y la tabla en `DataTable`.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Landmark, Wallet, ChevronDown, Plus, Save, X as CloseIcon,
    Globe, Hash, Users, UserCheck, Coins, Pencil, CreditCard, KeyRound,
    CalendarClock, ShieldCheck, Trash2,
} from 'lucide-react';
import DataTable from '../../../components/UI/DataTable';
import Button from '../../../components/UI/Button';
import Tooltip from '../../../components/UI/Tooltip';
import gestionBancosService from '../../../services/gestionBancosService';
import useEmpresaActiva, { esDeLaEmpresa, sinEmpresa, TODAS } from '../../../hooks/useEmpresaActiva';
import { apiFetch, authHeaders } from '../../../services/api';
import { useTmTr } from '../../../contexts/TmTrContext';

const VACIO_BANCO = { nombre: '', abreviatura: '', url: '', bic_swift: '', pais: 'ES' };
const VACIO_CUENTA = { empresa_id: '', alias: '', iban: '', moneda: 'EUR', titulares: '', autorizado: '' };
const VACIO_TARJETA = {
    alias: '', titular: '', primeros_digitos: '', ultimos_digitos: '',
    fecha_caducidad: '', tipo_tarjeta: 'DEBITO', limite: '', referencia_gestor: '', activa: 1,
};
const TIPOS_TARJETA = [['DEBITO', 'tipo_debito'], ['CREDITO', 'tipo_credito'], ['PREPAGO', 'tipo_prepago']];

/** `4539 •••• •••• 1234`, que es todo lo que esta base de datos sabe. */
const enmascararTarjeta = (tarjeta) => {
    const bin = (tarjeta.primeros_digitos || '').slice(0, 4);
    const fin = tarjeta.ultimos_digitos || '';
    return `${bin || '••••'} •••• •••• ${fin || '••••'}`;
};

/**
 * Tres renglones fijos: el hueco se reserva aunque falte el dato.
 *
 * Sin clases de color: dentro de una celda manda el color que `DataTable` pone
 * en la fila (`--color-on-table-row` y sus variantes de hover, selección y
 * cebra). La jerarquía se marca con peso y tamaño. Ver CRITERIOS_UI_LISTADOS.md.
 */
const lineasPersonas = (valor, t) => {
    const lineas = String(valor || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lineas.length) {
        return <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_datos')}</span>;
    }
    return lineas.slice(0, 3).map((linea, i) => (
        <span key={i} className="block text-xs font-bold leading-tight">{linea}</span>
    ));
};

const formatearIban = (iban) => String(iban || '').replace(/(.{4})/g, '$1 ').trim();

const formatearSaldo = (cuenta) => {
    const saldo = cuenta.saldo_ultima_consulta ?? cuenta.saldo_actual;
    if (saldo === null || saldo === undefined) return null;
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cuenta.moneda || 'EUR', maximumFractionDigits: 0, useGrouping: 'always' })
        .format(Number(saldo));
};

const formatearFecha = (fecha) => (fecha
    ? new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' })
    : null);

// ───────────────────────────────────────────────────────────────────────────
// Dato suelto de la ficha del banco
// ───────────────────────────────────────────────────────────────────────────
const Dato = ({ icono, rotulo, valor }) => {
    const { t } = useTmTr('BancosCuentas');
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-surface2 text-on-background">
                {icono}
            </div>
            <div className="min-w-0">
                <p className="mb-0.5 text-[11px] font-black uppercase tracking-widest text-on-surface2">{rotulo}</p>
                <p className="truncate text-lg font-black text-on-background">
                    {valor || <span className="text-xs font-bold uppercase tracking-widest text-on-surface2">{t('sin_datos')}</span>}
                </p>
            </div>
        </div>
    );
};

// ───────────────────────────────────────────────────────────────────────────
// Modal genérico
// ───────────────────────────────────────────────────────────────────────────
const Modal = ({ titulo, icono, onClose, children }) => {
    const { t } = useTmTr('BancosCuentas');
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-modal-backdrop/80 p-4 backdrop-blur-sm"
             onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="animate-in zoom-in-95 flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-surface1 shadow-2xl duration-200">
                <div className="flex items-center justify-between border-b border-border bg-surface2 p-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl border-2 border-border bg-surface2 p-2 text-on-background">{icono}</div>
                        <h2 className="text-xl font-black leading-none tracking-tight text-on-background">{titulo}</h2>
                    </div>
                    <button onClick={onClose} aria-label={t('cerrar')} className="rounded-full p-2 text-on-surface2 transition-colors hover:bg-surface3 hover:text-on-surface1">
                        <CloseIcon size={20} />
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-6">{children}</div>
            </div>
        </div>
    );
};

const Campo = ({ etiqueta, children }) => (
    <div className="space-y-1.5">
        <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-on-surface2">{etiqueta}</label>
        {children}
    </div>
);

// ───────────────────────────────────────────────────────────────────────────
// Pantalla
// ───────────────────────────────────────────────────────────────────────────
const BancosCuentasPage = () => {
    const { t } = useTmTr('BancosCuentas');
    const [bancos, setBancos] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const empresaActiva = useEmpresaActiva();
    const [bancoId, setBancoId] = useState('');
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState(null);

    const [formBanco, setFormBanco] = useState(null);      // null = modal cerrado
    const [editandoBanco, setEditandoBanco] = useState(null);
    const [formCuenta, setFormCuenta] = useState(null);
    const [editandoCuenta, setEditandoCuenta] = useState(null);
    const [tarjetas, setTarjetas] = useState([]);
    const [cuentaId, setCuentaId] = useState(null);       // cuenta cuyas tarjetas se ven
    const [formTarjeta, setFormTarjeta] = useState(null);
    const [editandoTarjeta, setEditandoTarjeta] = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            // Las empresas se piden aquí y no en el servicio de bancos porque
            // son un maestro de otro módulo. Faltaba en esta lista: el
            // desplegable «Empresa» del formulario de cuenta se quedaba vacío y
            // no había manera de asignarle una —y el servidor rechaza guardar
            // una cuenta sin empresa, así que editar cualquier cuenta fallaba.
            const [b, c, tj, em] = await Promise.all([
                gestionBancosService.getEntidades(),
                gestionBancosService.getCuentas(),
                gestionBancosService.getTarjetas(),
                apiFetch('/companies/mine', { headers: authHeaders() })
                    .then((r) => r.json())
                    .then((cuerpo) => cuerpo?.data || [])
                    .catch(() => []),
            ]);
            setBancos(b || []);
            setCuentas(c || []);
            setEmpresas(em || []);
            setTarjetas(tj || []);
            // El banco elegido se conserva entre recargas; si desaparece, cae al primero.
            setBancoId((actual) => {
                const sigue = (b || []).some((banco) => String(banco.id) === String(actual));
                return sigue ? actual : String((b || [])[0]?.id ?? '');
            });
        } catch (error) {
            // El motivo, no solo el hecho: un 401 (sesión caducada) y un 500 se
            // arreglan de maneras muy distintas, y «no se ha podido» no permite
            // distinguirlos sin abrir las herramientas del navegador.
            const codigo = error?.status ?? error?.response?.status;
            const detalle = codigo === 401 || codigo === 403
                ? t('error_sesion_caducada')
                : codigo
                    ? t('error_codigo_servidor').replace('{codigo}', codigo)
                    : t('error_sin_respuesta');
            setAviso({ tipo: 'error', texto: t('error_cargar').replace('{detalle}', detalle) });
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const banco = useMemo(
        () => bancos.find((b) => String(b.id) === String(bancoId)) || null,
        [bancos, bancoId]
    );

    // Las cuentas que se ven son las del banco elegido **y** las de la empresa
    // elegida arriba. Antes solo se miraba el banco: al cambiar de empresa la
    // lista no se movía (23/08/2026). Las cuentas sin empresa asignada se
    // siguen viendo siempre —si no, desaparecerían sin decir por qué y no
    // habría desde dónde ponerles la empresa—; se avisa aparte.
    const cuentasDelBanco = useMemo(
        () => cuentas.filter((c) => String(c.entidad_id) === String(bancoId) && esDeLaEmpresa(c, empresaActiva)),
        [cuentas, bancoId, empresaActiva]
    );

    const cuentasSinEmpresa = useMemo(
        () => sinEmpresa(cuentasDelBanco).length,
        [cuentasDelBanco]
    );

    const cuenta = useMemo(
        () => cuentasDelBanco.find((c) => String(c.id) === String(cuentaId)) || null,
        [cuentasDelBanco, cuentaId]
    );

    const tarjetasDeLaCuenta = useMemo(
        () => tarjetas.filter((tj) => String(tj.cuenta_id) === String(cuentaId)),
        [tarjetas, cuentaId]
    );

    // Cambiar de banco deja sin sentido la cuenta seleccionada del anterior.
    useEffect(() => { setCuentaId(null); }, [bancoId]);

    const cuentaTarjetas = (id) => tarjetas.filter((tj) => String(tj.cuenta_id) === String(id)).length;

    // ── Banco ──────────────────────────────────────────────
    const abrirNuevoBanco = () => { setEditandoBanco(null); setFormBanco({ ...VACIO_BANCO }); };
    const abrirEditarBanco = () => {
        if (!banco) return;
        setEditandoBanco(banco.id);
        setFormBanco({ nombre: banco.nombre || '', abreviatura: banco.abreviatura || '', url: banco.url || '', bic_swift: banco.bic_swift || '', pais: banco.pais || 'ES' });
    };

    const guardarBanco = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            if (editandoBanco) {
                await gestionBancosService.updateEntidad(editandoBanco, formBanco);
            } else {
                const res = await gestionBancosService.createEntidad(formBanco);
                if (res?.data) setBancoId(String(res.data));   // el INSERT devuelve el id nuevo
            }
            setFormBanco(null);
            setAviso({ tipo: 'ok', texto: editandoBanco ? t('banco_actualizado') : t('banco_creado') });
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_guardar_banco') });
        } finally {
            setGuardando(false);
        }
    };

    // ── Cuentas ────────────────────────────────────────────
    const abrirNuevaCuenta = () => {
        if (!banco) return;
        setEditandoCuenta(null);
        setFormCuenta({ ...VACIO_CUENTA, empresa_id: localStorage.getItem('empresaActiva') === 'todas' ? '' : (localStorage.getItem('empresaActiva') || '') });
    };

    const abrirEditarCuenta = (cuenta) => {
        setEditandoCuenta(cuenta.id);
        setFormCuenta({
            empresa_id: cuenta.empresa_id || '',
            alias: cuenta.alias || '',
            iban: cuenta.iban || '',
            moneda: cuenta.moneda || 'EUR',
            titulares: cuenta.titulares || '',
            autorizado: cuenta.autorizado || '',
        });
    };

    const guardarCuenta = async (e) => {
        e.preventDefault();

        // Renombrar una cuenta mueve los justificantes mensuales guardados, y
        // eso no puede pasar sin que nadie lo sepa: se pregunta primero, con el
        // número delante. Si se dijera que no y se guardara igual, los ficheros
        // viejos quedarían con un nombre que ya no existe y el sistema los
        // volvería a descargar del banco uno por uno.
        if (editandoCuenta && cuenta && formCuenta.alias !== cuenta.alias) {
            const total = (await gestionBancosService.contarArchivosCuenta(editandoCuenta)
                .then((r) => r.data).catch(() => 0)) || 0;
            if (total > 0) {
                const sigue = window.confirm(
                    t('confirmar_renombrar_extractos')
                        .replace('{n}', total)
                        .replace('{anterior}', cuenta.alias)
                        .replace('{nuevo}', formCuenta.alias)
                );
                if (!sigue) return;
            }
        }

        setGuardando(true);
        try {
            // `entidad` es el nombre descriptivo que la tabla arrastra desde antes
            // de existir `entidad_id`. Se rellena aquí para que las dos columnas
            // no se contradigan.
            const cuerpo = { ...formCuenta, entidad_id: banco?.id, entidad: banco?.nombre || '' };
            let renombrados = 0;
            if (editandoCuenta) {
                const res = await gestionBancosService.updateCuenta(editandoCuenta, cuerpo);
                renombrados = res?.data?.archivosRenombrados || 0;
            } else {
                await gestionBancosService.createCuenta(cuerpo);
            }
            setFormCuenta(null);
            setAviso({
                tipo: 'ok',
                texto: editandoCuenta
                    ? (renombrados
                        ? t('cuenta_actualizada_con_renombrados').replace('{n}', renombrados)
                        : t('cuenta_actualizada'))
                    : t('cuenta_creada'),
            });
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_guardar_cuenta') });
        } finally {
            setGuardando(false);
        }
    };

    /**
     * Borrar el banco (26/09/2026). Solo si ya no tiene cuentas: el botón está
     * apagado mientras las tenga, y el servidor lo vuelve a comprobar.
     */
    const borrarBanco = async () => {
        if (!banco || cuentasDelBanco.length) return;
        if (!window.confirm(t('confirmar_eliminar_banco').replace('{nombre}', banco.nombre))) return;
        setGuardando(true);
        try {
            await gestionBancosService.deleteEntidad(banco.id);
            setAviso({ tipo: 'ok', texto: t('banco_eliminado').replace('{nombre}', banco.nombre) });
            setBancoId('');
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_eliminar_banco') });
        } finally {
            setGuardando(false);
        }
    };

    const borrarCuenta = async (cuenta) => {
        try {
            await gestionBancosService.deleteCuenta(cuenta.id);
            setAviso({ tipo: 'ok', texto: t('cuenta_eliminada').replace('{alias}', cuenta.alias) });
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_eliminar_cuenta') });
        }
    };

    // ── Tarjetas ───────────────────────────────────────────
    const abrirNuevaTarjeta = () => {
        if (!cuenta) return;
        setEditandoTarjeta(null);
        setFormTarjeta({ ...VACIO_TARJETA, titular: '' });
    };

    const abrirEditarTarjeta = (tarjeta) => {
        setEditandoTarjeta(tarjeta.id);
        setFormTarjeta({
            alias: tarjeta.alias || '',
            titular: tarjeta.titular || '',
            primeros_digitos: tarjeta.primeros_digitos || '',
            ultimos_digitos: tarjeta.ultimos_digitos || '',
            fecha_caducidad: tarjeta.fecha_caducidad || '',
            tipo_tarjeta: tarjeta.tipo_tarjeta || 'DEBITO',
            limite: tarjeta.limite ?? '',
            referencia_gestor: tarjeta.referencia_gestor || '',
            activa: tarjeta.activa ?? 1,
        });
    };

    const guardarTarjeta = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const cuerpo = { ...formTarjeta, cuenta_id: cuenta?.id };
            if (editandoTarjeta) {
                await gestionBancosService.updateTarjeta(editandoTarjeta, cuerpo);
            } else {
                await gestionBancosService.createTarjeta(cuerpo);
            }
            setFormTarjeta(null);
            setAviso({ tipo: 'ok', texto: editandoTarjeta ? t('tarjeta_actualizada') : t('tarjeta_creada') });
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_guardar_tarjeta') });
        } finally {
            setGuardando(false);
        }
    };

    const borrarTarjeta = async (tarjeta) => {
        try {
            await gestionBancosService.deleteTarjeta(tarjeta.id);
            setAviso({ tipo: 'ok', texto: t('tarjeta_eliminada') });
            await cargar();
        } catch (error) {
            setAviso({ tipo: 'error', texto: t('error_eliminar_tarjeta') });
        }
    };

    // ── Columnas ───────────────────────────────────────────
    const columnas = [
        {
            id: 'alias',
            label: <span className="flex items-center gap-1.5"><Wallet size={13} /> {t('col_alias')}</span>,
            sortField: 'alias',
            render: (c) => <span className="text-sm font-black tracking-tight">{c.alias}</span>,
        },
        {
            id: 'iban',
            label: <span className="flex items-center gap-1.5"><Hash size={13} /> {t('col_iban')}</span>,
            sortField: 'iban',
            render: (c) => <span className="whitespace-nowrap font-mono text-[11px]">{formatearIban(c.iban)}</span>,
        },
        {
            id: 'titulares',
            label: <span className="flex items-center gap-1.5"><Users size={13} /> {t('col_titulares')}</span>,
            sortField: null,
            render: (c) => <div className="min-w-[140px]">{lineasPersonas(c.titulares, t)}</div>,
        },
        {
            id: 'autorizado',
            label: <span className="flex items-center gap-1.5"><UserCheck size={13} /> {t('col_autorizados')}</span>,
            sortField: null,
            render: (c) => <div className="min-w-[140px]">{lineasPersonas(c.autorizado, t)}</div>,
        },
        {
            id: 'tarjetas',
            label: <span className="flex items-center gap-1.5"><CreditCard size={13} /> {t('col_tarjetas')}</span>,
            sortField: null,
            render: (c) => {
                const total = cuentaTarjetas(c.id);
                return total
                    ? <span className="font-mono text-sm font-black">{total}</span>
                    : <span className="text-[11px] font-bold uppercase tracking-widest">{t('ninguna')}</span>;
            },
        },
        {
            id: 'saldo',
            label: <span className="flex items-center gap-1.5"><Coins size={13} /> {t('col_saldo')}</span>,
            sortField: 'saldo_ultima_consulta',
            render: (c) => {
                const saldo = formatearSaldo(c);
                if (saldo === null) {
                    return <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_datos')}</span>;
                }
                const fecha = formatearFecha(c.fecha_ultima_consulta);
                return (
                    <span className="flex flex-col">
                        <span className="font-mono text-base font-black">{saldo}</span>
                        <span className="text-[11px] font-bold uppercase tracking-widest">
                            {fecha || t('nunca')}
                        </span>
                    </span>
                );
            },
        },
    ];

    const columnasTarjeta = [
        {
            id: 'alias',
            label: <span className="flex items-center gap-1.5"><CreditCard size={13} /> {t('col_tarjeta')}</span>,
            sortField: 'alias',
            render: (tj) => (
                <span className="flex flex-col">
                    <span className="text-sm font-black tracking-tight">
                        {tj.alias || <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_alias')}</span>}
                    </span>
                    <span className="font-mono text-[11px]">{enmascararTarjeta(tj)}</span>
                </span>
            ),
        },
        {
            id: 'titular',
            label: <span className="flex items-center gap-1.5"><Users size={13} /> {t('col_titular')}</span>,
            sortField: 'titular',
            render: (tj) => <span className="whitespace-nowrap text-xs font-bold">{tj.titular}</span>,
        },
        {
            id: 'tipo',
            label: <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> {t('col_tipo')}</span>,
            sortField: 'tipo_tarjeta',
            render: (tj) => {
                const encontrado = TIPOS_TARJETA.find(([v]) => v === tj.tipo_tarjeta);
                return (
                    <span className="inline-flex items-center rounded border border-border bg-surface2 px-1.5 text-xs font-bold">
                        {encontrado ? t(encontrado[1]) : (tj.tipo_tarjeta || '—')}
                    </span>
                );
            },
        },
        {
            id: 'caducidad',
            label: <span className="flex items-center gap-1.5"><CalendarClock size={13} /> {t('col_caduca')}</span>,
            sortField: 'fecha_caducidad',
            render: (tj) => (tj.fecha_caducidad
                ? <span className="whitespace-nowrap font-mono text-xs font-bold">{tj.fecha_caducidad}</span>
                : <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_datos')}</span>),
        },
        {
            id: 'limite',
            label: <span className="flex items-center gap-1.5"><Coins size={13} /> {t('col_limite')}</span>,
            sortField: 'limite',
            render: (tj) => (tj.limite !== null && tj.limite !== undefined
                ? <span className="font-mono text-sm font-black">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(Number(tj.limite))}
                  </span>
                : <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_datos')}</span>),
        },
        {
            id: 'gestor',
            label: <span className="flex items-center gap-1.5"><KeyRound size={13} /> {t('col_ficha_completa')}</span>,
            sortField: null,
            render: (tj) => (tj.referencia_gestor
                ? <span className="text-xs font-bold">{tj.referencia_gestor}</span>
                : <span className="text-[11px] font-bold uppercase tracking-widest">{t('sin_datos')}</span>),
        },
    ];

    const buscar = (c, q) => `${c.alias} ${c.iban} ${c.titulares || ''} ${c.autorizado || ''}`.toLowerCase().includes(q);
    const buscarTarjeta = (tj, q) => `${tj.alias || ''} ${tj.titular} ${tj.ultimos_digitos || ''} ${tj.referencia_gestor || ''}`.toLowerCase().includes(q);

    return (
        <div className="animate-in fade-in space-y-5">
            {/* Cabecera */}
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl border-2 border-border bg-surface2 p-2.5 text-on-background shadow-sm">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h1 className="mb-1 text-2xl font-black leading-none tracking-tight text-on-background">
                            {t('titulo')}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
                            {t('subtitulo')}
                        </p>
                    </div>
                </div>
            </header>

            {aviso && (
                <div className={`animate-in slide-in-from-top flex items-center justify-between rounded-2xl border p-4 shadow-lg duration-300
                    ${aviso.tipo === 'ok' ? 'border-success bg-success text-on-success' : 'border-destructive bg-destructive text-on-destructive'}`}>
                    <span className="font-bold">{aviso.texto}</span>
                    <button onClick={() => setAviso(null)} aria-label={t('cerrar_aviso')} className="rounded-full p-1 transition-colors hover:bg-surface-hover">
                        <CloseIcon size={18} />
                    </button>
                </div>
            )}

            {/* ── Arriba: el banco ── */}
            <section className="space-y-4 rounded-3xl border border-border bg-surface2 p-5 shadow-sm">
                <div className="flex w-full flex-col items-end gap-4 md:flex-row">
                    {/* Botones del banco a la izquierda, delante del selector
                        (01/10/2026, petición del usuario). */}
                    <div className="flex shrink-0 items-center gap-4">
                        {/* Nuevo banco: el círculo con «+» del tema, el mismo que
                            «Agregar cuenta» en Extractos, a la izquierda de «Editar
                            banco» (25/09/2026). Antes era un botón con texto en la
                            cabecera. */}
                        <Tooltip texto={t('boton_nuevo_banco')}>
                            <button
                                type="button" onClick={abrirNuevoBanco} aria-label={t('boton_nuevo_banco')}
                                className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-primary-border bg-primary text-on-primary transition-colors hover:border-on-background"
                            >
                                <Plus size={20} />
                            </button>
                        </Tooltip>
                        <Tooltip texto={t('tooltip_editar_banco')}>
                            {/* Solo el lápiz, redondo como «+» y la papelera (01/10/2026). */}
                            <Button
                                variant="secondary" isIconOnly rounded="full" onClick={abrirEditarBanco} disabled={!banco}
                                aria-label={t('boton_editar_banco')} className="h-[45px] w-[45px] shrink-0"
                            >
                                <Pencil size={18} />
                            </Button>
                        </Tooltip>
                        {/* Papelera: borrar el banco. Apagada mientras tenga cuentas. */}
                        <Tooltip texto={banco && cuentasDelBanco.length ? t('tooltip_eliminar_banco_con_cuentas') : t('boton_eliminar_banco')}>
                            <button
                                type="button" onClick={borrarBanco}
                                disabled={!banco || cuentasDelBanco.length > 0 || guardando}
                                aria-label={t('boton_eliminar_banco')}
                                className="grid h-[45px] w-[45px] shrink-0 place-items-center rounded-full border-2 border-destructive-border bg-destructive text-on-destructive transition-colors hover:border-on-background disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash2 size={19} />
                            </button>
                        </Tooltip>
                    </div>
                    <div className="w-full flex-1 space-y-1.5">
                        <label htmlFor="selector-banco" className="ml-1 text-[11px] font-black uppercase tracking-widest text-on-surface2">
                            {t('label_banco')}
                        </label>
                        <div className="relative">
                            <select
                                id="selector-banco"
                                className="input-base h-[45px] w-full appearance-none rounded-xl border-border bg-background px-4 pr-10 text-sm font-bold"
                                value={bancoId}
                                onChange={(e) => setBancoId(e.target.value)}
                            >
                                {bancos.length === 0 && <option value="">{t('sin_bancos_opcion')}</option>}
                                {bancos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                            </select>
                            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface2/50" />
                        </div>
                    </div>
                </div>

                {banco && (
                    <div className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-surface1 p-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Dato icono={<Landmark size={20} />} rotulo={t('dato_entidad')} valor={banco.nombre} />
                        <Dato icono={<Hash size={20} />} rotulo={t('dato_abreviatura')} valor={banco.abreviatura} />
                        <Dato icono={<Globe size={20} />} rotulo={t('dato_direccion_web')} valor={banco.url} />
                        <Dato icono={<Hash size={20} />} rotulo={t('dato_bic_swift')} valor={banco.bic_swift} />
                        <Dato icono={<Globe size={20} />} rotulo={t('dato_pais')} valor={banco.pais} />
                        <Dato icono={<Wallet size={20} />} rotulo={t('dato_cuentas')} valor={String(cuentasDelBanco.length)} />
                    </div>
                )}
            </section>

            {/* ── Debajo: sus cuentas ── */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-on-surface2">
                        {t('cuentas_de').replace('{banco}', banco?.nombre || '—')}
                    </h2>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface2">
                        {(cuentasDelBanco.length === 1
                            ? t('contador_cuenta_singular')
                            : t('contador_cuentas_plural')).replace('{n}', cuentasDelBanco.length)}
                    </span>
                </div>

                {empresaActiva !== TODAS && cuentasSinEmpresa > 0 && (
                    <p className="rounded-xl border border-border bg-surface1 px-4 py-2 text-[11px] font-bold text-on-surface2">
                        {cuentasSinEmpresa === 1
                            ? t('aviso_cuenta_sin_empresa_singular')
                            : t('aviso_cuentas_sin_empresa_plural').replace('{n}', cuentasSinEmpresa)}
                    </p>
                )}

                <DataTable
                    columns={columnas}
                    data={cuentasDelBanco}
                    keyField="id"
                    rowsPerPage={10}
                    searchFn={buscar}
                    onAdd={banco ? abrirNuevaCuenta : null}
                    onView={(c) => setCuentaId((actual) => (String(actual) === String(c.id) ? null : c.id))}
                    onEdit={abrirEditarCuenta}
                    onDelete={borrarCuenta}
                    selectedId={cuentaId}
                    emptyMessage={cargando ? t('cargando') : t('sin_cuentas')}
                />
            </section>

            {/* ── Al fondo: las tarjetas de la cuenta elegida ── */}
            <section className="space-y-3">
                {!cuenta ? (
                    <div className="rounded-3xl border border-dashed border-border bg-surface2/40 px-5 py-10 text-center">
                        <CreditCard size={32} className="mx-auto mb-3 text-on-surface2" />
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface2">
                            {t('selecciona_cuenta')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-on-surface2">
                                {t('tarjetas_de').replace('{cuenta}', cuenta.alias)}
                            </h2>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface2">
                                {(tarjetasDeLaCuenta.length === 1
                                    ? t('contador_tarjeta_singular')
                                    : t('contador_tarjetas_plural')).replace('{n}', tarjetasDeLaCuenta.length)}
                            </span>
                        </div>

                        <DataTable
                            columns={columnasTarjeta}
                            data={tarjetasDeLaCuenta}
                            keyField="id"
                            rowsPerPage={5}
                            searchFn={buscarTarjeta}
                            onAdd={abrirNuevaTarjeta}
                            onEdit={abrirEditarTarjeta}
                            onDelete={borrarTarjeta}
                            emptyMessage={t('sin_tarjetas')}
                        />

                        <p className="flex items-start gap-2 px-1 text-[11px] font-bold uppercase tracking-widest text-on-surface2">
                            <KeyRound size={14} className="mt-px shrink-0" />
                            {t('aviso_datos_sensibles_lista')}
                        </p>
                    </>
                )}
            </section>

            {/* ── Modales ── */}
            {formBanco && (
                <Modal titulo={editandoBanco ? t('modal_editar_banco') : t('modal_nuevo_banco')} icono={<Landmark size={20} />} onClose={() => setFormBanco(null)}>
                    <form onSubmit={guardarBanco} className="space-y-5">
                        <Campo etiqueta={t('campo_nombre_banco')}>
                            <input required autoFocus className="input-base w-full" value={formBanco.nombre}
                                onChange={(e) => setFormBanco({ ...formBanco, nombre: e.target.value })} placeholder={t('ph_nombre_banco')} />
                        </Campo>
                        <Campo etiqueta={t('campo_abreviatura')}>
                            <input required maxLength={10} className="input-base w-full font-mono uppercase" value={formBanco.abreviatura}
                                onChange={(e) => setFormBanco({ ...formBanco, abreviatura: e.target.value.toUpperCase() })} placeholder={t('ph_abreviatura')} />
                            <p className="mt-1 text-[11px] font-bold text-on-surface2">
                                {t('ayuda_abreviatura')}
                            </p>
                        </Campo>
                        <Campo etiqueta={t('campo_direccion_web')}>
                            <input type="url" maxLength={255} className="input-base w-full font-mono" value={formBanco.url}
                                onChange={(e) => setFormBanco({ ...formBanco, url: e.target.value })} placeholder={t('ph_direccion_web')} />
                            <p className="mt-1 text-[11px] font-bold text-on-surface2">
                                {t('ayuda_direccion_web')}
                            </p>
                        </Campo>
                        <Campo etiqueta={t('campo_bic_swift')}>
                            <input className="input-base w-full font-mono" value={formBanco.bic_swift}
                                onChange={(e) => setFormBanco({ ...formBanco, bic_swift: e.target.value.toUpperCase() })} placeholder={t('ph_bic_swift')} />
                        </Campo>
                        <Campo etiqueta={t('campo_pais_iso')}>
                            <input maxLength={2} className="input-base w-full font-mono uppercase" value={formBanco.pais}
                                onChange={(e) => setFormBanco({ ...formBanco, pais: e.target.value.toUpperCase() })} />
                        </Campo>
                        <div className="flex gap-3 border-t border-border pt-4">
                            <Button type="submit" variant="primary" size="lg" loading={guardando} leftIcon={<Save size={18} />}>
                                {editandoBanco ? t('boton_guardar_cambios') : t('boton_dar_alta')}
                            </Button>
                            <Button type="button" variant="ghost" size="lg" onClick={() => setFormBanco(null)}>{t('boton_cancelar')}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {formCuenta && (
                <Modal titulo={editandoCuenta ? t('modal_editar_cuenta') : t('modal_nueva_cuenta')} icono={<Wallet size={20} />} onClose={() => setFormCuenta(null)}>
                    <form onSubmit={guardarCuenta} className="space-y-5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-on-surface2">
                            {t('en_banco').replace('{banco}', banco?.nombre || '')}
                        </p>
                        <Campo etiqueta={t('campo_empresa')}><select required className="input-base w-full" value={formCuenta.empresa_id} onChange={(e) => setFormCuenta({ ...formCuenta, empresa_id: e.target.value })}><option value="">{t('opcion_selecciona_empresa')}</option>{empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}</select></Campo>
                        <Campo etiqueta={t('campo_alias_interno')}>
                            <input required autoFocus className="input-base w-full" value={formCuenta.alias}
                                onChange={(e) => setFormCuenta({ ...formCuenta, alias: e.target.value })} placeholder={t('ph_alias_interno')} />
                        </Campo>
                        <Campo etiqueta={t('campo_iban')}>
                            <input required className="input-base w-full font-mono" value={formCuenta.iban}
                                onChange={(e) => setFormCuenta({ ...formCuenta, iban: e.target.value.replace(/\s+/g, '').toUpperCase() })} />
                        </Campo>
                        <Campo etiqueta={t('campo_moneda')}>
                            <input maxLength={3} className="input-base w-full font-mono uppercase" value={formCuenta.moneda}
                                onChange={(e) => setFormCuenta({ ...formCuenta, moneda: e.target.value.toUpperCase() })} />
                        </Campo>
                        <Campo etiqueta={t('campo_titulares')}>
                            <textarea rows={3} className="input-base w-full resize-none leading-snug" value={formCuenta.titulares}
                                onChange={(e) => setFormCuenta({ ...formCuenta, titulares: e.target.value })} />
                        </Campo>
                        <Campo etiqueta={t('campo_autorizados')}>
                            <textarea rows={3} className="input-base w-full resize-none leading-snug" value={formCuenta.autorizado}
                                onChange={(e) => setFormCuenta({ ...formCuenta, autorizado: e.target.value })} />
                        </Campo>
                        <div className="flex gap-3 border-t border-border pt-4">
                            <Button type="submit" variant="primary" size="lg" loading={guardando} leftIcon={<Save size={18} />}>
                                {editandoCuenta ? t('boton_guardar_cambios') : t('boton_dar_alta')}
                            </Button>
                            <Button type="button" variant="ghost" size="lg" onClick={() => setFormCuenta(null)}>{t('boton_cancelar')}</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {formTarjeta && (
                <Modal titulo={editandoTarjeta ? t('modal_editar_tarjeta') : t('modal_nueva_tarjeta')} icono={<CreditCard size={20} />} onClose={() => setFormTarjeta(null)}>
                    <form onSubmit={guardarTarjeta} className="space-y-5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-on-surface2">
                            {t('en_cuenta').replace('{cuenta}', cuenta?.alias || '')}
                        </p>
                        <Campo etiqueta={t('campo_alias_tarjeta')}>
                            <input autoFocus className="input-base w-full" value={formTarjeta.alias}
                                onChange={(e) => setFormTarjeta({ ...formTarjeta, alias: e.target.value })} placeholder={t('ph_alias_tarjeta')} />
                        </Campo>
                        <Campo etiqueta={t('campo_titular')}>
                            <input required className="input-base w-full" value={formTarjeta.titular}
                                onChange={(e) => setFormTarjeta({ ...formTarjeta, titular: e.target.value })} placeholder={t('ph_titular')} />
                        </Campo>

                        <div className="grid grid-cols-2 gap-4">
                            <Campo etiqueta={t('campo_primeros_seis')}>
                                <input inputMode="numeric" maxLength={6} className="input-base w-full font-mono" value={formTarjeta.primeros_digitos}
                                    onChange={(e) => setFormTarjeta({ ...formTarjeta, primeros_digitos: e.target.value.replace(/\D/g, '') })} placeholder={t('ph_primeros_seis')} />
                            </Campo>
                            <Campo etiqueta={t('campo_ultimos_cuatro')}>
                                <input inputMode="numeric" maxLength={4} className="input-base w-full font-mono" value={formTarjeta.ultimos_digitos}
                                    onChange={(e) => setFormTarjeta({ ...formTarjeta, ultimos_digitos: e.target.value.replace(/\D/g, '') })} placeholder={t('ph_ultimos_cuatro')} />
                            </Campo>
                        </div>

                        {/* No es un adorno: es la respuesta a «¿y los seis de en medio?» en el
                            único sitio donde alguien se lo va a preguntar. */}
                        <p className="flex items-start gap-2 rounded-2xl border border-border bg-surface2 p-3 text-[11px] font-bold leading-relaxed text-on-surface1">
                            <KeyRound size={16} className="mt-px shrink-0 text-primary" />
                            {t('aviso_datos_sensibles_formulario')}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <Campo etiqueta={t('campo_caducidad')}>
                                <input className="input-base w-full font-mono" value={formTarjeta.fecha_caducidad}
                                    onChange={(e) => setFormTarjeta({ ...formTarjeta, fecha_caducidad: e.target.value })} placeholder={t('ph_caducidad')} />
                            </Campo>
                            <Campo etiqueta={t('campo_tipo')}>
                                <select className="input-base w-full" value={formTarjeta.tipo_tarjeta}
                                    onChange={(e) => setFormTarjeta({ ...formTarjeta, tipo_tarjeta: e.target.value })}>
                                    {TIPOS_TARJETA.map(([valor, clave]) => <option key={valor} value={valor}>{t(clave)}</option>)}
                                </select>
                            </Campo>
                        </div>

                        <Campo etiqueta={t('campo_limite')}>
                            <input inputMode="decimal" className="input-base w-full font-mono" value={formTarjeta.limite}
                                onChange={(e) => setFormTarjeta({ ...formTarjeta, limite: e.target.value.replace(',', '.') })} placeholder={t('ph_limite')} />
                        </Campo>
                        <Campo etiqueta={t('campo_ficha_completa')}>
                            <input className="input-base w-full" value={formTarjeta.referencia_gestor}
                                onChange={(e) => setFormTarjeta({ ...formTarjeta, referencia_gestor: e.target.value })}
                                placeholder={t('ph_ficha_completa')} />
                        </Campo>

                        <div className="flex gap-3 border-t border-border pt-4">
                            <Button type="submit" variant="primary" size="lg" loading={guardando} leftIcon={<Save size={18} />}>
                                {editandoTarjeta ? t('boton_guardar_cambios') : t('boton_dar_alta')}
                            </Button>
                            <Button type="button" variant="ghost" size="lg" onClick={() => setFormTarjeta(null)}>{t('boton_cancelar')}</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default BancosCuentasPage;
