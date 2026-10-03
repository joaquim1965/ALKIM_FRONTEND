import React, { useState, useEffect } from 'react';
import { Landmark, CreditCard, Contact2, Wallet, Pencil, X } from 'lucide-react';
import Button from '../../../components/UI/Button';
import Tooltip from '../../../components/UI/Tooltip';
import gestionBancosService from '../../../services/gestionBancosService';

const GestionBancos = ({ defaultSubTab, hideTabs = false }) => {
    const [activeTab, setActiveTab] = useState(defaultSubTab || 'entidades');
    const [loading, setLoading] = useState(false);

    // Sync tab if prop changes
    useEffect(() => {
        if (defaultSubTab) setActiveTab(defaultSubTab);
    }, [defaultSubTab]);

    // Data states
    const [entidades, setEntidades] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [tarjetas, setTarjetas] = useState([]);

    // Forms
    // El mismo formulario sirve para alta y para edición: cuando `editandoX`
    // tiene un id, el submit va al PUT y el panel cambia de título. Un editor
    // aparte —modal o pantalla— obligaría a mantener dos formularios en
    // paralelo, que es como se acaban desincronizando los campos nuevos.
    const VACIO_ENTIDAD = { nombre: '', bic_swift: '', pais: 'ES' };
    const VACIO_CUENTA = { alias: '', entidad_id: '', iban: '', moneda: 'EUR', saldo_actual: '0', titulares: '', autorizado: '' };

    const [formEntidad, setFormEntidad] = useState(VACIO_ENTIDAD);
    const [formCuenta, setFormCuenta] = useState(VACIO_CUENTA);
    const [editandoEntidad, setEditandoEntidad] = useState(null);
    const [editandoCuenta, setEditandoCuenta] = useState(null);
    const [formContacto, setFormContacto] = useState({ entidad_id: '', nombre: '', cargo: '', telefono: '', email: '' });
    const [formTarjeta, setFormTarjeta] = useState({ cuenta_id: '', ultimos_digitos: '', titular: '', fecha_caducidad: '', tipo_tarjeta: 'DEBITO' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [e, c, con, t] = await Promise.all([
                gestionBancosService.getEntidades(),
                gestionBancosService.getCuentas(),
                gestionBancosService.getContactos(),
                gestionBancosService.getTarjetas()
            ]);
            setEntidades(e || []); setCuentas(c || []); setContactos(con || []); setTarjetas(t || []);
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Form Handlers
    const handleCrearEntidad = async (e) => {
        e.preventDefault();
        try {
             if (editandoEntidad) {
                 await gestionBancosService.updateEntidad(editandoEntidad, formEntidad);
             } else {
                 await gestionBancosService.createEntidad(formEntidad);
             }
             cancelarEdicionEntidad();
             fetchData();
        } catch (error) { alert(editandoEntidad ? "Error al guardar la entidad" : "Error al crear la entidad"); }
    };

    const editarEntidad = (entidad) => {
        setEditandoEntidad(entidad.id);
        setFormEntidad({
            nombre: entidad.nombre || '',
            bic_swift: entidad.bic_swift || '',
            pais: entidad.pais || 'ES',
        });
    };

    const cancelarEdicionEntidad = () => {
        setEditandoEntidad(null);
        setFormEntidad(VACIO_ENTIDAD);
    };
    
    const handleDeleteEntidad = async (id) => {
        if(window.confirm('¿Seguro que deseas evaluar (borrar) esta entidad y todo lo que dependa de ella?')) {
            await gestionBancosService.deleteEntidad(id);
            fetchData();
        }
    };

    const handleCrearCuenta = async (e) => {
        e.preventDefault();
        try {
            if (editandoCuenta) {
                await gestionBancosService.updateCuenta(editandoCuenta, formCuenta);
            } else {
                await gestionBancosService.createCuenta(formCuenta);
            }
            cancelarEdicionCuenta();
            fetchData();
        } catch (error) { alert(editandoCuenta ? "Error al guardar la cuenta" : "Error al crear cuenta"); }
    };

    const editarCuenta = (cuenta) => {
        setEditandoCuenta(cuenta.id);
        setFormCuenta({
            alias: cuenta.alias || '',
            entidad_id: cuenta.entidad_id || '',
            iban: cuenta.iban || '',
            moneda: cuenta.moneda || 'EUR',
            saldo_actual: cuenta.saldo_actual ?? '0',
            titulares: cuenta.titulares || '',
            autorizado: cuenta.autorizado || '',
        });
    };

    const cancelarEdicionCuenta = () => {
        setEditandoCuenta(null);
        setFormCuenta(VACIO_CUENTA);
    };

    // Tres renglones fijos: el hueco se reserva aunque falte el dato, para que
    // las filas de la tabla no bailen de alto. La ausencia se escribe, no se
    // deja en blanco (criterio de CRITERIOS_UI_LISTADOS.md).
    const lineasPersonas = (valor) => {
        const lineas = String(valor || '').split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lineas.length) {
            return <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface2">Sin datos</span>;
        }
        return lineas.slice(0, 3).map((linea, i) => (
            <span key={i} className="block text-xs font-bold text-on-surface1 leading-tight">{linea}</span>
        ));
    };
    const handleDeleteCuenta = async (id) => {
        if(window.confirm('¿Borrar esta cuenta y sus transacciones / tarjetas asociadas?')) {
            await gestionBancosService.deleteCuenta(id);
            fetchData();
        }
    };

    const handleCrearContacto = async (e) => {
        e.preventDefault();
        try {
            await gestionBancosService.createContacto(formContacto);
            setFormContacto({ entidad_id: '', nombre: '', cargo: '', telefono: '', email: '' });
            fetchData();
        } catch (error) { alert("Error al registrar contacto"); }
    };
    const handleDeleteContacto = async (id) => {
        if(window.confirm('¿Borrar este contacto de la base de datos?')) {
            await gestionBancosService.deleteContacto(id);
            fetchData();
        }
    };

    const handleCrearTarjeta = async (e) => {
        e.preventDefault();
        try {
            await gestionBancosService.createTarjeta(formTarjeta);
            setFormTarjeta({ cuenta_id: '', ultimos_digitos: '', titular: '', fecha_caducidad: '', tipo_tarjeta: 'DEBITO' });
            fetchData();
        } catch (error) { alert("Error al dar de alta la tarjeta"); }
    };
    const handleDeleteTarjeta = async (id) => {
        if(window.confirm('¿Eliminar esta tarjeta del sistema permanentemente?')) {
            await gestionBancosService.deleteTarjeta(id);
            fetchData();
        }
    };

    // Colores de pestaña del tema (styles/utilities.css, 03/10/2026).
    const tabClass = (id) => `tab-base shrink-0 ${activeTab === id ? 'tab-active' : ''}`;

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in">


            <div className="bg-surface1 border border-border rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                {/* Tabs Header */}
                {!hideTabs && (
                    <div role="tablist" className="tab-bar flex-nowrap overflow-x-auto custom-scrollbar rounded-none border-0 border-b">
                        <button onClick={() => setActiveTab('entidades')} className={tabClass('entidades')}>
                            <Landmark size={18} /> Entidades / Bancos
                        </button>
                        <button onClick={() => setActiveTab('cuentas')} className={tabClass('cuentas')}>
                            <Wallet size={18} /> Cuentas Corrientes
                        </button>
                        <button onClick={() => setActiveTab('contactos')} className={tabClass('contactos')}>
                            <Contact2 size={18} /> Contactos y Gestores
                        </button>
                        <button onClick={() => setActiveTab('tarjetas')} className={tabClass('tarjetas')}>
                            <CreditCard size={18} /> Tarjetas
                        </button>
                    </div>
                )}

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* --- ENTIDADES --- */}
                    {activeTab === 'entidades' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-surface2/50 p-6 rounded-xl border border-border h-fit">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">{editandoEntidad ? 'Editar Entidad' : 'Nueva Entidad'}</h3>
                                    {editandoEntidad && (
                                        <Tooltip texto="Descartar los cambios y volver al alta">
                                            <button type="button" onClick={cancelarEdicionEntidad} aria-label="Cancelar edición de la entidad"
                                                className="text-on-surface2 hover:text-on-surface1 transition-colors"><X size={18} /></button>
                                        </Tooltip>
                                    )}
                                </div>
                                <form onSubmit={handleCrearEntidad} className="space-y-4">
                                    <div><label className="text-sm font-bold">Nombre del Banco</label><input required className="input-base w-full mt-1" value={formEntidad.nombre} onChange={e=>setFormEntidad({...formEntidad, nombre: e.target.value})} placeholder="Ej: CaixaBank"/></div>
                                    <div><label className="text-sm font-bold">BIC / SWIFT</label><input className="input-base w-full mt-1" value={formEntidad.bic_swift} onChange={e=>setFormEntidad({...formEntidad, bic_swift: e.target.value})} /></div>
                                    <div><label className="text-sm font-bold">País (ISO)</label><input maxLength="2" className="input-base w-full mt-1" value={formEntidad.pais} onChange={e=>setFormEntidad({...formEntidad, pais: e.target.value})} /></div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>{editandoEntidad ? 'Guardar Cambios' : 'Dar de Alta'}</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2">
                                <table className="w-full text-left font-mono text-sm border-collapse">
                                    <thead><tr className="bg-table-header text-on-table-header uppercase tracking-wider text-xs"><th className="p-3">Acciones</th><th className="p-3">Banco</th><th className="p-3">SWIFT</th><th className="p-3">País</th></tr></thead>
                                    <tbody>
                                        {entidades.map(e => (
                                            <tr key={e.id} className="bg-table-row text-on-table-row transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover">
                                                <td className="p-3">
                                                    <div className="flex gap-1.5">
                                                        <Tooltip texto="Editar esta entidad">
                                                            <Button size="xs" variant="outline" onClick={()=>editarEntidad(e)} aria-label={`Editar la entidad ${e.nombre}`}><Pencil size={13} /></Button>
                                                        </Tooltip>
                                                        <Button size="xs" variant="destructive" onClick={()=>handleDeleteEntidad(e.id)}>Borrar</Button>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-medium">{e.nombre}</td><td className="p-3">{e.bic_swift}</td><td className="p-3">{e.pais}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- CUENTAS --- */}
                    {activeTab === 'cuentas' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-surface2/50 p-6 rounded-xl border border-border h-fit">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">{editandoCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
                                    {editandoCuenta && (
                                        <Tooltip texto="Descartar los cambios y volver al alta">
                                            <button type="button" onClick={cancelarEdicionCuenta} aria-label="Cancelar edición de la cuenta"
                                                className="text-on-surface2 hover:text-on-surface1 transition-colors"><X size={18} /></button>
                                        </Tooltip>
                                    )}
                                </div>
                                <form onSubmit={handleCrearCuenta} className="space-y-4">
                                    <div><label className="text-sm font-bold">Alias Interno</label><input required className="input-base w-full mt-1" value={formCuenta.alias} onChange={e=>setFormCuenta({...formCuenta, alias: e.target.value})} placeholder="Cuenta Nóminas Principal" /></div>
                                    <div><label className="text-sm font-bold">Entidad Bancaria</label>
                                        <select required className="input-base w-full mt-1" value={formCuenta.entidad_id} onChange={e=>setFormCuenta({...formCuenta, entidad_id: e.target.value})}>
                                            <option value="">Selecciona Banco...</option>
                                            {entidades.map(en => <option key={en.id} value={en.id}>{en.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-sm font-bold">IBAN</label><input required className="input-base w-full mt-1" value={formCuenta.iban} onChange={e=>setFormCuenta({...formCuenta, iban: e.target.value})} /></div>
                                    <div>
                                        <label className="text-sm font-bold" htmlFor="cuenta-titulares">Titulares</label>
                                        <textarea id="cuenta-titulares" rows={3} className="input-base w-full mt-1 resize-none leading-snug"
                                            value={formCuenta.titulares}
                                            onChange={e=>setFormCuenta({...formCuenta, titulares: e.target.value})}
                                            placeholder={"Un nombre por línea\n(hasta 3)"} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold" htmlFor="cuenta-autorizado">Autorizados</label>
                                        <textarea id="cuenta-autorizado" rows={3} className="input-base w-full mt-1 resize-none leading-snug"
                                            value={formCuenta.autorizado}
                                            onChange={e=>setFormCuenta({...formCuenta, autorizado: e.target.value})}
                                            placeholder={"Un nombre por línea\n(hasta 3)"} />
                                    </div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>{editandoCuenta ? 'Guardar Cambios' : 'Dar de Alta Cuenta'}</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2">
                                <table className="w-full text-left font-mono text-sm border-collapse">
                                    <thead><tr className="bg-table-header text-on-table-header uppercase tracking-wider text-xs"><th className="p-3">Acciones</th><th className="p-3">Alias</th><th className="p-3">Entidad</th><th className="p-3">IBAN</th><th className="p-3">Titulares</th><th className="p-3">Autorizados</th></tr></thead>
                                    <tbody>
                                        {cuentas.map(c => (
                                            <tr key={c.id} className="bg-table-row text-on-table-row transition-colors duration-100 hover:bg-table-row-hover hover:text-on-table-row-hover">
                                                <td className="p-3 align-top">
                                                    <div className="flex gap-1.5">
                                                        <Tooltip texto="Editar esta cuenta">
                                                            <Button size="xs" variant="outline" onClick={()=>editarCuenta(c)} aria-label={`Editar la cuenta ${c.alias}`}><Pencil size={13} /></Button>
                                                        </Tooltip>
                                                        <Button size="xs" variant="destructive" onClick={()=>handleDeleteCuenta(c.id)}>Borrar</Button>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-medium align-top">{c.alias}</td><td className="p-3 align-top">{c.entidad_nombre}</td><td className="p-3 truncate max-w-[200px] align-top">{c.iban}</td>
                                                <td className="p-3 align-top font-sans">{lineasPersonas(c.titulares)}</td>
                                                <td className="p-3 align-top font-sans">{lineasPersonas(c.autorizado)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- CONTACTOS --- */}
                    {activeTab === 'contactos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-surface2/50 p-6 rounded-xl border border-border h-fit">
                                <h3 className="font-bold text-lg mb-4">Añadir Contacto</h3>
                                <form onSubmit={handleCrearContacto} className="space-y-4">
                                    <div><label className="text-sm font-bold">Banco Pertenece</label>
                                        <select required className="input-base w-full mt-1" value={formContacto.entidad_id} onChange={e=>setFormContacto({...formContacto, entidad_id: e.target.value})}>
                                            <option value="">Selecciona Banco...</option>
                                            {entidades.map(en => <option key={en.id} value={en.id}>{en.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-sm font-bold">Nombre</label><input required className="input-base w-full mt-1" value={formContacto.nombre} onChange={e=>setFormContacto({...formContacto, nombre: e.target.value})} /></div>
                                    <div><label className="text-sm font-bold">Cargo</label><input required className="input-base w-full mt-1" value={formContacto.cargo} onChange={e=>setFormContacto({...formContacto, cargo: e.target.value})} placeholder="Ej: Gestor empresas" /></div>
                                    <div><label className="text-sm font-bold">Teléfono / Email</label>
                                        <div className="flex gap-2 mt-1">
                                            <input className="input-base w-1/2" placeholder="Telf" value={formContacto.telefono} onChange={e=>setFormContacto({...formContacto, telefono: e.target.value})} />
                                            <input className="input-base w-1/2 flex-1" placeholder="Email" type="email" value={formContacto.email} onChange={e=>setFormContacto({...formContacto, email: e.target.value})} />
                                        </div>
                                    </div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>Guardar Contacto</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                {contactos.map(c => (
                                    <div key={c.id} className="border border-border rounded-xl p-4 bg-surface2/40 relative">
                                        <div className="absolute top-4 right-4">
                                             <button onClick={()=>handleDeleteContacto(c.id)} className="text-destructive font-mono text-xs font-bold hover:underline">ELIMINAR</button>
                                        </div>
                                        <h4 className="font-bold text-lg text-on-surface1">{c.nombre}</h4>
                                        <p className="text-sm text-primary font-medium">{c.cargo} • {c.entidad_nombre}</p>
                                        <div className="mt-3 font-mono text-sm text-on-surface2 space-y-1">
                                            {c.telefono && <p>📞 {c.telefono}</p>}
                                            {c.email && <p>✉️ {c.email}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TARJETAS --- */}
                    {activeTab === 'tarjetas' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-surface2/50 p-6 rounded-xl border border-border h-fit">
                                <h3 className="font-bold text-lg mb-4">Vincular Tarjeta</h3>
                                <form onSubmit={handleCrearTarjeta} className="space-y-4">
                                    <div><label className="text-sm font-bold">Cuenta Corriente</label>
                                        <select required className="input-base w-full mt-1" value={formTarjeta.cuenta_id} onChange={e=>setFormTarjeta({...formTarjeta, cuenta_id: e.target.value})}>
                                            <option value="">Selecciona la cuenta base...</option>
                                            {cuentas.map(cu => <option key={cu.id} value={cu.id}>{cu.alias} ({cu.iban})</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-sm font-bold">Últimos 4 Dígitos</label><input required maxLength="4" className="input-base w-full mt-1 font-mono tracking-widest text-lg" value={formTarjeta.ultimos_digitos} onChange={e=>setFormTarjeta({...formTarjeta, ultimos_digitos: e.target.value.replace(/\D/g,'')})} placeholder="----" /></div>
                                    <div><label className="text-sm font-bold">Titular (Impreso)</label><input required className="input-base w-full mt-1" value={formTarjeta.titular} onChange={e=>setFormTarjeta({...formTarjeta, titular: e.target.value.toUpperCase()})} /></div>
                                    <div className="flex gap-4">
                                        <div className="flex-1"><label className="text-sm font-bold">Caducidad</label><input required placeholder="MM/YYYY" maxLength="7" className="input-base w-full mt-1 font-mono" value={formTarjeta.fecha_caducidad} onChange={e=>setFormTarjeta({...formTarjeta, fecha_caducidad: e.target.value})} /></div>
                                        <div className="flex-1"><label className="text-sm font-bold">Tipo</label>
                                            <select required className="input-base w-full mt-1" value={formTarjeta.tipo_tarjeta} onChange={e=>setFormTarjeta({...formTarjeta, tipo_tarjeta: e.target.value})}>
                                                <option value="DEBITO">DÉBITO</option><option value="CREDITO">CRÉDITO</option><option value="PREPAGO">PREPAGO</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>Añadir Tarjeta</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                {tarjetas.map(t => (
                                    <div key={t.id} className="relative rounded-2xl overflow-hidden shadow-lg p-5 border border-border
                                        bg-surface2 text-on-surface2 min-h-[180px] flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <CreditCard className="opacity-80" size={28}/>
                                            <span className="text-xs font-bold bg-surface-hover px-2 py-1 rounded">{t.tipo_tarjeta}</span>
                                        </div>
                                        <div className="mt-4">
                                            <p className="font-mono text-xl tracking-[0.25em] opacity-90">•••• •••• •••• {t.ultimos_digitos}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-4">
                                            <div>
                                                <p className="text-[10px] uppercase opacity-70 mb-0.5">Titular</p>
                                                <p className="font-medium text-sm">{t.titular}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase opacity-70 mb-0.5">Caduca</p>
                                                <p className="font-mono text-sm">{t.fecha_caducidad}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteTarjeta(t.id)} className="absolute top-4 right-[70px] text-destructive-border hover:text-destructive-border bg-surface-hover px-2 py-1 rounded text-xs font-bold backdrop-blur-md transition-colors">BORRAR</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GestionBancos;
