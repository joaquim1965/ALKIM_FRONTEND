import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, Users } from 'lucide-react';
import { apiFetch, authHeaders } from '../services/api';

/**
 * Selector de la barra: primero el GRUPO y luego la ENTIDAD (12/10/2026).
 *
 * Por defecto, el primer grupo creado de los del usuario. Al cambiar de grupo
 * la entidad vuelve a «todas» (las del nuevo grupo) y se avisa con
 * `empresa-activa-cambiada`, como al cambiar de entidad, para que cada
 * pantalla recargue. El grupo viaja al servidor en la cabecera `X-Group-Id`.
 */
const CompanyDropdown = () => {
  const [grupos, setGrupos] = useState([]);
  const [grupo, setGrupo] = useState(localStorage.getItem('grupoActivo') || '');
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(localStorage.getItem('empresaActiva') || '');

  // Antes solo se cargaba una vez al montar, así que una entidad recién creada
  // no aparecía hasta recargar. Escucha `empresa-activa-cambiada` y vuelve a
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

  // Grupos del usuario. Si el guardado ya no es suyo, el servidor devuelve el
  // primero en `activo` y se corrige aquí.
  const cargarGrupos = useCallback(() => {
    apiFetch('/companies/grupos/mios', { headers: authHeaders() })
      .then((response) => response.json())
      .then((body) => {
        const rows = body.success ? body.data : [];
        setGrupos(rows);
        const guardado = localStorage.getItem('grupoActivo') || '';
        const valido = rows.some((g) => String(g.id) === guardado);
        const next = valido ? guardado : (body.activo ? String(body.activo) : '');
        if (next !== guardado) {
          if (next) localStorage.setItem('grupoActivo', next); else localStorage.removeItem('grupoActivo');
          localStorage.setItem('empresaActiva', 'todas');
          window.dispatchEvent(new CustomEvent('empresa-activa-cambiada', { detail: 'todas' }));
        }
        setGrupo(next);
      })
      .catch(() => setGrupos([]));
  }, []);

  useEffect(() => {
    cargarGrupos();
    cargarEmpresas();
    window.addEventListener('empresa-activa-cambiada', cargarEmpresas);
    return () => window.removeEventListener('empresa-activa-cambiada', cargarEmpresas);
  }, [cargarEmpresas, cargarGrupos]);

  const cambiarGrupo = (event) => {
    const next = event.target.value;
    setGrupo(next);
    localStorage.setItem('grupoActivo', next);
    localStorage.setItem('empresaActiva', 'todas');
    setSelected('todas');
    window.dispatchEvent(new CustomEvent('grupo-activo-cambiado', { detail: next }));
    window.dispatchEvent(new CustomEvent('empresa-activa-cambiada', { detail: 'todas' }));
  };

  const change = (event) => {
    const next = event.target.value;
    setSelected(next);
    localStorage.setItem('empresaActiva', next);
    window.dispatchEvent(new CustomEvent('empresa-activa-cambiada', { detail: next }));
  };

  if (!grupos.length && !companies.length) return null;
  const grupoVisible = grupos.length === 1 ? grupos[0].nombre : null;
  const visible = companies.length === 1 ? companies[0].nombre : null;
  return (
    <div className="flex items-center gap-2">
      {grupos.length > 0 && (
        <label className="relative flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-on-navbar">
          <Users size={16} />
          {!grupoVisible && <ChevronDown size={14} className="pointer-events-none" />}
          {grupoVisible ? <span className="font-bold">{grupoVisible}</span> : (
            <select aria-label="Grupo activo" value={grupo} onChange={cambiarGrupo} className="select-propia appearance-none bg-transparent font-bold outline-none">
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
        </label>
      )}
      {companies.length > 0 && (
        <label className="relative flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-on-navbar">
          <Building2 size={16} />
          {/* Flecha a la izquierda, delante del texto (04/10/2026). */}
          {!visible && <ChevronDown size={14} className="pointer-events-none" />}
          {visible ? <span>{visible}</span> : <select aria-label="Empresa activa" value={selected} onChange={change} className="select-propia appearance-none bg-transparent font-bold outline-none">
            <option value="todas">Todas las empresas</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nombre}</option>)}
          </select>}
        </label>
      )}
    </div>
  );
};

export default CompanyDropdown;
