import React, { useState, useEffect } from 'react';
import { BadgeEuro, Plus, Trash2, Calendar, Percent, CreditCard, Landmark, AlertCircle } from 'lucide-react';
import Button from '../../../components/UI/Button';
import { useTmTr } from '../../../contexts/TmTrContext';
import bancosService from '../../../services/bancosService';

const PrestamosTab = () => {
    const [prestamos, setPrestamos] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        entidad_id: '',
        cuenta_id: '',
        tipo: 'PRESTAMO',
        alias: '',
        fecha_inicio: '',
        fecha_vencimiento: '',
        importe_concedido: '',
        importe_pendiente: '',
        cuota_mensual: '',
        tipo_interes: '',
        periodicidad: 'MENSUAL'
    });

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch banks, accounts and loans
            const [pRes, eRes, cRes] = await Promise.all([
                fetch('/bancos/prestamos').then(r => r.json()),
                fetch('/bancos/entidades').then(r => r.json()),
                fetch('/bancos/cuentas').then(r => r.json())
            ]);
            
            if (pRes.success) setPrestamos(pRes.data);
            if (eRes.success) setEntidades(eRes.data);
            if (cRes.success) setCuentas(cRes.data);
        } catch (error) {
            console.error('Error loading loans data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/bancos/prestamos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const result = await res.json();
            if (result.success) {
                setForm({
                    entidad_id: '', cuenta_id: '', tipo: 'PRESTAMO', alias: '',
                    fecha_inicio: '', fecha_vencimiento: '', importe_concedido: '',
                    importe_pendiente: '', cuota_mensual: '', tipo_interes: '', periodicidad: 'MENSUAL'
                });
                loadData();
            }
        } catch (error) {
            console.error('Error creating loan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este préstamo/hipoteca?')) return;
        try {
            const res = await fetch(`/bancos/prestamos/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) loadData();
        } catch (error) {
            console.error('Error deleting loan:', error);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Formulario de Alta */}
            <div className="lg:col-span-1 bg-surface2/50 p-6 rounded-xl border border-border h-fit">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <BadgeEuro className="text-primary" /> Nuevo Préstamo / Hipoteca
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold">Tipo</label>
                        <select className="input-base w-full mt-1" value={form.tipo} onChange={e=>setForm({...form, tipo: e.target.value})}>
                            <option value="PRESTAMO">Préstamo</option>
                            <option value="HIPOTECA">Hipoteca</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-bold">Alias / Identificador</label>
                        <input required className="input-base w-full mt-1" value={form.alias} onChange={e=>setForm({...form, alias: e.target.value})} placeholder="Ej: Hipoteca Casa Sitges" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-bold">Banco</label>
                            <select required className="input-base w-full mt-1" value={form.entidad_id} onChange={e=>setForm({...form, entidad_id: e.target.value})}>
                                <option value="">Selecciona...</option>
                                {entidades.map(en => <option key={en.id} value={en.id}>{en.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold">Cuenta Pago</label>
                            <select required className="input-base w-full mt-1" value={form.cuenta_id} onChange={e=>setForm({...form, cuenta_id: e.target.value})}>
                                <option value="">Selecciona...</option>
                                {cuentas.map(cu => <option key={cu.id} value={cu.id}>{cu.alias}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-bold">Importe Concedido</label>
                            <input required type="number" step="0.01" className="input-base w-full mt-1" value={form.importe_concedido} onChange={e=>setForm({...form, importe_concedido: e.target.value, importe_pendiente: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold">Cuota Mensual</label>
                            <input required type="number" step="0.01" className="input-base w-full mt-1" value={form.cuota_mensual} onChange={e=>setForm({...form, cuota_mensual: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-bold">Interés (%)</label>
                            <input type="number" step="0.01" className="input-base w-full mt-1" value={form.tipo_interes} onChange={e=>setForm({...form, tipo_interes: e.target.value})} placeholder="Ej: 3.25" />
                        </div>
                        <div>
                            <label className="text-sm font-bold">Periodicidad</label>
                            <select className="input-base w-full mt-1" value={form.periodicidad} onChange={e=>setForm({...form, periodicidad: e.target.value})}>
                                <option value="MENSUAL">Mensual</option>
                                <option value="TRIMESTRAL">Trimestral</option>
                                <option value="ANUAL">Anual</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-bold">F. Inicio</label>
                            <input required type="date" className="input-base w-full mt-1" value={form.fecha_inicio} onChange={e=>setForm({...form, fecha_inicio: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-bold">F. Vencimiento</label>
                            <input type="date" className="input-base w-full mt-1" value={form.fecha_vencimiento} onChange={e=>setForm({...form, fecha_vencimiento: e.target.value})} />
                        </div>
                    </div>
                    <Button type="submit" variant="primary" fullWidth loading={loading}>Registrar Operación</Button>
                </form>
            </div>

            {/* Listado de Préstamos */}
            <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                    <Calendar className="text-on-surface2" /> Operaciones Activas
                </h3>
                {prestamos.length === 0 ? (
                    <div className="bg-surface1 border border-border p-8 rounded-xl text-center text-on-surface2">
                        No hay préstamos o hipotecas registradas.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prestamos.map(p => (
                            <div key={p.id} className="bg-surface1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all group relative">
                                <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="absolute top-4 right-4 p-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${p.tipo === 'HIPOTECA' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                        {p.tipo === 'HIPOTECA' ? <Landmark size={24} /> : <CreditCard size={24} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center pr-8">
                                            <h4 className="font-bold text-lg">{p.alias}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.estado ? 'bg-success/10 text-success' : 'bg-on-surface2/10 text-on-surface2'}`}>
                                                {p.estado ? 'ACTIVO' : 'CANCELADO'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-on-surface2 flex items-center gap-1 mt-1">
                                            {p.banco_nombre} • {p.cuenta_alias}
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <p className="text-[10px] text-on-surface2 uppercase font-bold tracking-wider">Pendiente</p>
                                                <p className="text-lg font-mono font-bold">{parseFloat(p.importe_pendiente).toLocaleString()}€</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-on-surface2 uppercase font-bold tracking-wider">Cuota</p>
                                                <p className="text-lg font-mono font-bold text-primary">{parseFloat(p.cuota_mensual).toLocaleString()}€</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Percent size={12}/> {p.tipo_interes}%
                                            </span>
                                            <span className="flex items-center gap-1 font-mono">
                                                <Calendar size={12}/> {new Date(p.fecha_inicio).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrestamosTab;
