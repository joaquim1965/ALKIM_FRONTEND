import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { apiFetch, authHeaders } from '../services/api';

const CompanyDropdown = () => {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(localStorage.getItem('empresaActiva') || '');

  // Antes solo se cargaba una vez al montar (`useEffect(..., [])`), así que una
  // empresa recién creada en /gestion/empresas no aparecía aquí hasta recargar
  // la página, aunque esa misma pantalla dispara `empresa-activa-cambiada` al
  // guardar. Ahora este componente también escucha ese evento y vuelve a
  // pedir `/companies/mine` (11/09/2026).
  const cargarEmpresas = useCallback(() => {
    apiFetch('/companies/mine', { headers: authHeaders() })
      .then((response) => response.json())
      .then((body) => {
        const rows = body.success ? body.data : [];
        setCompanies(rows);
        setSelected((actual) => {
          const valid = rows.some((company) => String(company.id) === actual);
          if (valid) return actual;
          const next = rows.length === 1 ? String(rows[0].id) : 'todas';
          localStorage.setItem('empresaActiva', next);
          return next;
        });
      })
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    cargarEmpresas();
    window.addEventListener('empresa-activa-cambiada', cargarEmpresas);
    return () => window.removeEventListener('empresa-activa-cambiada', cargarEmpresas);
  }, [cargarEmpresas]);

  if (!companies.length) return null;
  const change = (event) => {
    const next = event.target.value;
    setSelected(next);
    localStorage.setItem('empresaActiva', next);
    window.dispatchEvent(new CustomEvent('empresa-activa-cambiada', { detail: next }));
  };
  const visible = companies.length === 1 ? companies[0].nombre : null;
  return (
    <label className="relative flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-on-navbar">
      <Building2 size={16} />
      {/* Flecha a la izquierda, delante del texto (04/10/2026). */}
      {!visible && <ChevronDown size={14} className="pointer-events-none" />}
      {visible ? <span>{visible}</span> : <select aria-label="Empresa activa" value={selected} onChange={change} className="select-propia appearance-none bg-transparent font-bold outline-none">
        <option value="todas">Todas las empresas</option>
        {companies.map((company) => <option key={company.id} value={company.id}>{company.nombre}</option>)}
      </select>}
    </label>
  );
};

export default CompanyDropdown;
