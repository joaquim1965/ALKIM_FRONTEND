import React, { useState, useEffect } from 'react';
import { Landmark, CreditCard, Contact2, Wallet } from 'lucide-react';
import Button from '../../../components/UI/Button';
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
    const [formEntidad, setFormEntidad] = useState({ nombre: '', bic_swift: '', pais: 'ES' });
    const [formCuenta, setFormCuenta] = useState({ alias: '', entidad_id: '', iban: '', moneda: 'EUR', saldo_actual: '0' });
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
             await gestionBancosService.createEntidad(formEntidad);
             setFormEntidad({ nombre: '', bic_swift: '', pais: 'ES' });
             fetchData();
        } catch (error) { alert("Error al crear la entidad"); }
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
            await gestionBancosService.createCuenta(formCuenta);
            setFormCuenta({ alias: '', entidad_id: '', iban: '', moneda: 'EUR', saldo_actual: '0' });
            fetchData();
        } catch (error) { alert("Error al crear cuenta"); }
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

    const tabClass = (id) => `
        shrink-0 px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors
        ${activeTab === id 
            ? 'border-primary text-primary bg-primary/5' 
            : 'border-transparent text-on-surface2 hover:text-on-surface1 hover:border-border'}
    `;

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in">


            <div className="bg-surface1 border border-border rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                {/* Tabs Header */}
                {!hideTabs && (
                    <div className="flex border-b border-border bg-surface2 overflow-x-auto custom-scrollbar">
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
                                <h3 className="font-bold text-lg mb-4">Nueva Entidad</h3>
                                <form onSubmit={handleCrearEntidad} className="space-y-4">
                                    <div><label className="text-sm font-bold">Nombre del Banco</label><input required className="input-base w-full mt-1" value={formEntidad.nombre} onChange={e=>setFormEntidad({...formEntidad, nombre: e.target.value})} placeholder="Ej: CaixaBank"/></div>
                                    <div><label className="text-sm font-bold">BIC / SWIFT</label><input className="input-base w-full mt-1" value={formEntidad.bic_swift} onChange={e=>setFormEntidad({...formEntidad, bic_swift: e.target.value})} /></div>
                                    <div><label className="text-sm font-bold">País (ISO)</label><input maxLength="2" className="input-base w-full mt-1" value={formEntidad.pais} onChange={e=>setFormEntidad({...formEntidad, pais: e.target.value})} /></div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>Dar de Alta</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2">
                                <table className="w-full text-left font-mono text-sm border-collapse">
                                    <thead><tr className="border-b-2 border-border text-on-surface2 uppercase tracking-wider text-xs"><th className="p-3">Banco</th><th className="p-3">SWIFT</th><th className="p-3">País</th><th className="p-3 text-right">Acciones</th></tr></thead>
                                    <tbody>
                                        {entidades.map(e => (
                                            <tr key={e.id} className="border-b border-border/50 hover:bg-surface2/30">
                                                <td className="p-3 font-medium text-on-surface1">{e.nombre}</td><td className="p-3">{e.bic_swift}</td><td className="p-3">{e.pais}</td>
                                                <td className="p-3 text-right"><Button size="xs" variant="destructive" onClick={()=>handleDeleteEntidad(e.id)}>Borrar</Button></td>
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
                                <h3 className="font-bold text-lg mb-4">Nueva Cuenta</h3>
                                <form onSubmit={handleCrearCuenta} className="space-y-4">
                                    <div><label className="text-sm font-bold">Alias Interno</label><input required className="input-base w-full mt-1" value={formCuenta.alias} onChange={e=>setFormCuenta({...formCuenta, alias: e.target.value})} placeholder="Cuenta Nóminas Principal" /></div>
                                    <div><label className="text-sm font-bold">Entidad Bancaria</label>
                                        <select required className="input-base w-full mt-1" value={formCuenta.entidad_id} onChange={e=>setFormCuenta({...formCuenta, entidad_id: e.target.value})}>
                                            <option value="">Selecciona Banco...</option>
                                            {entidades.map(en => <option key={en.id} value={en.id}>{en.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="text-sm font-bold">IBAN</label><input required className="input-base w-full mt-1" value={formCuenta.iban} onChange={e=>setFormCuenta({...formCuenta, iban: e.target.value})} /></div>
                                    <Button type="submit" variant="primary" fullWidth loading={loading}>Dar de Alta Cuenta</Button>
                                </form>
                            </div>
                            <div className="lg:col-span-2">
                                <table className="w-full text-left font-mono text-sm border-collapse">
                                    <thead><tr className="border-b-2 border-border text-on-surface2 uppercase tracking-wider text-xs"><th className="p-3">Alias</th><th className="p-3">Entidad</th><th className="p-3">IBAN</th><th className="p-3 text-right">Acciones</th></tr></thead>
                                    <tbody>
                                        {cuentas.map(c => (
                                            <tr key={c.id} className="border-b border-border/50 hover:bg-surface2/30">
                                                <td className="p-3 font-medium">{c.alias}</td><td className="p-3">{c.entidad_nombre}</td><td className="p-3 truncate max-w-[200px]">{c.iban}</td>
                                                <td className="p-3 text-right"><Button size="xs" variant="destructive" onClick={()=>handleDeleteCuenta(c.id)}>Borrar</Button></td>
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
                                    <div key={t.id} className="relative rounded-2xl overflow-hidden shadow-lg p-5 border border-border/10
                                        bg-gradient-to-br from-gray-800 to-gray-900 text-white min-h-[180px] flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <CreditCard className="opacity-80" size={28}/>
                                            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded backdrop-blur-sm">{t.tipo_tarjeta}</span>
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
                                        <button onClick={() => handleDeleteTarjeta(t.id)} className="absolute top-4 right-[70px] text-red-400 hover:text-red-300 bg-black/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-md transition-colors">BORRAR</button>
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
