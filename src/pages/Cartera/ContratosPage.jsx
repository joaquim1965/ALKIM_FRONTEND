/**
 * ContratosPage — Cartera ▸ Contratos (05/10/2026, sustituye a Unidades: ya no hay UF).
 *
 * Todos los contratos de todas las propiedades: qué se alquila (la propiedad
 * entera o sus espacios), a quién, por cuánto y hasta cuándo. Se crean y editan
 * en la ficha de la propiedad (pestaña Contratos, o «Alquilar» en Espacios);
 * el lápiz abre esa pestaña.
 *
 * API: GET /propiedades/contratos[?terminados=1]
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import DataTable from '../../components/UI/DataTable';
import { CabeceraPagina, Panel, CabeceraPanel, Casilla, AvisoError, SinDato } from '../../components/UI/TemaPagina';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';
import { formatImporte } from '../../utils/format';

const fechaEs = (f) => (f ? f.split('-').reverse().join('/') : null);
const euros = (v) => (v == null || v === '' ? null : formatImporte(v, ''));

export default function ContratosPage() {
  const { t } = useTmTr('Contratos');
  const navegar = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [terminados, setTerminados] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const r = await apiFetch(`/propiedades/contratos${terminados ? '?terminados=1' : ''}`, { headers: authHeaders() });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.message || `Error ${r.status}`);
      setContratos(b.data || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, [terminados]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (c) => navegar(`/cartera/propiedades?id=${c.propiedad_id}&pestana=contratos`);
  const renta = contratos.filter((c) => ['VIGENTE', 'PRORROGADO'].includes(c.estado)).reduce((a, c) => a + Number(c.renta_mensual || 0), 0);

  const columnas = [
    { id: 'propiedad', label: t('col_propiedad', 'Propiedad'), sortField: 'propiedad_nombre', render: (c) => <span className="font-black">{c.propiedad_nombre}</span> },
    { id: 'que', label: t('col_que', 'Qué se alquila'), sortField: 'espacios', render: (c) => c.espacios || t('entera', 'Propiedad entera') },
    { id: 'inquilino', label: t('inquilino', 'Inquilino'), sortField: 'inquilino', render: (c) => c.inquilino || <SinDato /> },
    { id: 'modalidad', label: t('modalidad', 'Modalidad'), sortField: 'modalidad_nombre', render: (c) => c.modalidad_nombre },
    { id: 'renta', label: t('renta', 'Renta mensual (€)'), sortField: 'renta_mensual', render: (c) => <span className="font-mono">{euros(c.renta_mensual)}</span> },
    { id: 'fechas', label: t('col_fechas', 'Fechas'), sortField: 'fecha_inicio', render: (c) => <span className="font-mono">{fechaEs(c.fecha_inicio)} → {fechaEs(c.fecha_rescision || c.fecha_fin) || '…'}</span> },
    { id: 'estado', label: t('col_estado', 'Estado'), sortField: 'estado', render: (c) => t(`contrato_${String(c.estado).toLowerCase()}`, c.estado) },
    { id: 'emite', label: t('col_emite', 'Emite'), sortField: 'arrendador_nombre', render: (c) => c.arrendador_nombre },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CabeceraPagina icono={<FileSignature size={24} />} titulo={t('titulo_lista', 'Contratos')}
        subtitulo={t('subtitulo_lista', 'Lo que está alquilado en todas las propiedades. Se crean en cada propiedad (Espacios ▸ Alquilar).')} />
      <AvisoError>{error}</AvisoError>
      <Panel className="overflow-hidden">
        <CabeceraPanel icono={<FileSignature size={20} />} titulo={t('titulo_lista', 'Contratos')}
          contador={`${contratos.length} ${t('contratos', 'contratos')} · ${euros(renta) || '0,00'} €/${t('mes', 'mes')}`}>
          <Casilla etiqueta={t('ver_terminados', 'Ver terminados')} checked={terminados} onChange={setTerminados} />
        </CabeceraPanel>
        {cargando
          ? <div className="px-5 py-12 text-center text-xs font-bold uppercase tracking-widest">{t('cargando', 'Cargando…')}</div>
          : (
            <div className="p-3">
              <DataTable
                columns={columnas} data={contratos} keyField="id" rowsPerPage={20}
                searchFn={(c, q) => `${c.codigo} ${c.propiedad_nombre} ${c.espacios || ''} ${c.inquilino || ''}`.toLowerCase().includes(q)}
                onEdit={abrir}
                emptyMessage={t('vacio_lista', 'Todavía no hay contratos. Se crean en la propiedad: Espacios ▸ Alquilar.')}
              />
            </div>
          )}
      </Panel>
    </div>
  );
}
