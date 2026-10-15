import React, { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { TablaTema, claseFila, TD } from '../UI/TemaPagina';
import { apiFetch, authHeaders } from '../../services/api';
import { useTmTr } from '../../contexts/TmTrContext';

/**
 * Panel de control → «Entidades del grupo» (12/10/2026, fase 2 de grupos).
 *
 * Matriz: una fila por miembro del grupo y una columna por entidad del grupo.
 * En cada celda, el acceso de ese miembro a esa entidad. Se guarda al momento.
 * Solo el administrador del grupo (o el superadmin, en todos los grupos) lo
 * ve y lo cambia; el servidor lo vuelve a comprobar.
 *
 * Los administradores del grupo ven siempre todas sus entidades: su fila se
 * enseña, pero sin selector.
 */
const ACCESOS = ['', 'CONSULTA', 'SOCIO', 'ADMINISTRADOR', 'PROPIETARIO'];

const ESTILO = {
  '': 'bg-surface1 text-on-surface2 border-border',
  CONSULTA: 'bg-info text-on-info border-info-border',
  SOCIO: 'bg-info text-on-info border-info-border',
  ADMINISTRADOR: 'bg-warning text-on-warning border-warning-border',
  PROPIETARIO: 'bg-success text-on-success border-success-border',
};

const leerJson = async (r) => {
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false) throw new Error(body.message || `Error ${r.status}`);
  return body;
};

const EntidadesGrupo = () => {
  const { t } = useTmTr('EntidadesGrupo');
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState('');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState('');
  const [error, setError] = useState('');

  const etiqueta = (rol) => ({
    '': t('sin_acceso', 'Sin acceso'),
    CONSULTA: t('consulta', 'Consulta'),
    SOCIO: t('socio', 'Socio'),
    ADMINISTRADOR: t('administrador', 'Administrador'),
    PROPIETARIO: t('propietario', 'Propietario'),
  }[rol] ?? rol);

  // Solo los grupos que administra. Por defecto, el activo de la barra.
  useEffect(() => {
    apiFetch('/companies/grupos/mios', { headers: authHeaders() })
      .then(leerJson)
      .then((body) => {
        const mios = (body.data || []).filter((g) => g.rol === 'ADMINISTRADOR');
        setGrupos(mios);
        const activo = localStorage.getItem('grupoActivo');
        const elegido = mios.find((g) => String(g.id) === activo) || mios[0];
        setGrupoId(elegido ? String(elegido.id) : '');
      })
      .catch((e) => setError(e.message));
  }, []);

  const cargar = useCallback(() => {
    if (!grupoId) return;
    setCargando(true);
    setError('');
    apiFetch(`/companies/grupos/${grupoId}/matriz`, { headers: authHeaders() })
      .then(leerJson)
      .then((body) => setDatos(body.data))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [grupoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const accesoDe = (uid, empresaId) =>
    datos?.accesos.find((a) => Number(a.usuario_id) === Number(uid) && Number(a.empresa_id) === Number(empresaId))?.rol || '';

  const cambiar = async (uid, empresaId, rol) => {
    const clave = `${uid}-${empresaId}`;
    setGuardando(clave);
    setError('');
    try {
      await apiFetch(`/companies/grupos/${grupoId}/asignacion`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ usuario_id: uid, empresa_id: empresaId, rol: rol || null }),
      }).then(leerJson);
      setDatos((d) => ({
        ...d,
        accesos: [
          ...d.accesos.filter((a) => !(Number(a.usuario_id) === Number(uid) && Number(a.empresa_id) === Number(empresaId))),
          ...(rol ? [{ usuario_id: uid, empresa_id: empresaId, rol }] : []),
        ],
      }));
      // La barra y las pantallas abiertas recargan sus entidades.
      window.dispatchEvent(new CustomEvent('empresa-activa-cambiada', { detail: localStorage.getItem('empresaActiva') || 'todas' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando('');
    }
  };

  if (!grupos.length && !error) {
    return <p className="p-4 text-on-surface2">{t('no_administra', 'No administras ningún grupo.')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Users size={18} className="text-on-surface2" />
        <span className="font-bold text-on-surface1">{t('grupo', 'Grupo')}</span>
        {grupos.length > 1 ? (
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}
            className="rounded-lg border border-border bg-surface1 px-3 py-1.5 text-sm font-bold text-on-surface1">
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        ) : <span className="font-bold text-on-surface1">{grupos[0]?.nombre}</span>}
      </div>

      <p className="text-sm text-on-surface2">
        {t('explicacion', 'Elige qué entidades del grupo ve cada miembro y con qué permiso. Los administradores del grupo ven siempre todas. Los cambios se guardan al momento.')}
      </p>

      {error && <p className="rounded-lg border border-destructive-border bg-destructive px-3 py-2 text-sm text-on-destructive">{error}</p>}

      {cargando && (
        <div className="flex items-center gap-3 p-4 text-on-surface2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {t('cargando', 'Cargando...')}
        </div>
      )}

      {datos && !cargando && (
        datos.entidades.length === 0 ? (
          <p className="p-4 text-on-surface2">{t('sin_entidades', 'Este grupo aún no tiene entidades.')}</p>
        ) : (
          // Colores de tabla del tema (docs/CRITERIOS_UI_LISTADOS.md): la fila
          // da el color; la celda solo espacio.
          <TablaTema columnas={[{ texto: t('miembro', 'Miembro') }, ...datos.entidades.map((e) => ({ texto: e.nombre }))]}>
            {datos.miembros.map((m, i) => {
              const esAdmin = m.rol_grupo === 'ADMINISTRADOR' || Number(m.rol_global) >= 3;
              return (
                <tr key={m.uid} className={claseFila(i)}>
                  <td className={TD}>
                    <span className="block font-bold">{`${m.nombre || ''} ${m.apellido || ''}`.trim() || m.usuario}</span>
                    <span className="block text-xs opacity-80">
                      {m.email} · {esAdmin ? t('admin_grupo', 'Administrador del grupo') : t('miembro', 'Miembro')}
                    </span>
                  </td>
                  {datos.entidades.map((e) => {
                    if (esAdmin) {
                      return (
                        <td key={e.id} className={TD}>
                          <span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${ESTILO.PROPIETARIO}`}>
                            {t('todas_admin', 'Todo')}
                          </span>
                        </td>
                      );
                    }
                    const rol = accesoDe(m.uid, e.id);
                    const clave = `${m.uid}-${e.id}`;
                    return (
                      <td key={e.id} className={TD}>
                        <select
                          value={rol}
                          disabled={guardando === clave}
                          onChange={(ev) => cambiar(m.uid, e.id, ev.target.value)}
                          className={`rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50 ${ESTILO[rol] || ESTILO['']}`}
                        >
                          {ACCESOS.map((a) => <option key={a} value={a}>{etiqueta(a)}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </TablaTema>
        )
      )}
    </div>
  );
};

export default EntidadesGrupo;
