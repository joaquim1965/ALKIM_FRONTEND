/**
 * Sessions.jsx
 *
 * Página de gestión de sesiones activas
 * Permite ver, cerrar sesiones individuales o cerrar todas
 */

import React, { useState, useEffect } from 'react';
import { useTmTr } from '../contexts/TmTrContext';

import authService from '../services/authService';
import { Button } from '../components/UI/Button';
import {

  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  MapPin,
  LogOut,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

const Sessions = () => {
  const { t } = useTmTr('Sessions');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Cargar sesiones al montar
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getSessions();
      setSessions(response.data.sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cerrar una sesión específica
  const handleRevokeSession = async (sessionId) => {
    try {
      setActionLoading(sessionId);
      setError(null);
      await authService.revokeSession(sessionId);
      setSuccessMessage(t('Parrafo4'));
      // Recargar sesiones
      await loadSessions();
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Cerrar todas las sesiones
  const handleRevokeAll = async () => {
    if (!confirm(t('Parrafo1'))) {
      return;
    }

    try {
      setActionLoading('all');
      setError(null);
      const response = await authService.revokeAllSessions();
      setSuccessMessage(
        `${response.data.revoked} ${t('SesiónesCerradas')}`
      );
      // Recargar sesiones
      await loadSessions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Icono según el dispositivo
  const getDeviceIcon = (device) => {
    switch (device) {
      case 'Móvil':
        return <Smartphone className="w-6 h-6" />;
      case 'Tablet':
        return <Tablet className="w-6 h-6" />;
      default:
        return <Monitor className="w-6 h-6" />;
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-background">
            {t('SesionesActivas')}
          </h1>
          <p className="mt-2 text-on-surface1">
            {t('Parrafo1')}
          </p>
        </div>

        {/* Mensajes de éxito/error */}
        {successMessage && (
          <div className="mb-6 bg-success text-on-success px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-destructive text-on-destructive px-4 py-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="secondary"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            {t('Actualizar')}
          </Button>

          {sessions.length > 1 && (
            <Button
              variant="destructive"
              onClick={handleRevokeAll}
              disabled={actionLoading === 'all'}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {actionLoading === 'all'
                ? t('Cerrando')
                : t('Parrafo1')}
            </Button>
          )}
        </div>

        {/* Lista de sesiones */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="mt-2 text-on-surface1">{t('CargandoSesiones')}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-surface1 rounded-lg border border-border">
            <Monitor className="w-12 h-12 mx-auto text-secondary" />
            <p className="mt-2 text-on-surface1">{t('Parrafo1')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`bg-surface1 rounded-lg border p-6 ${session.es_actual
                    ? 'border-primary border-2'
                    : 'border-border'
                  }`}
              >
                <div className="flex items-start justify-between">
                  {/* Info de la sesión */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${session.es_actual
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface2 text-on-surface2'
                        }`}
                    >
                      {getDeviceIcon(session.dispositivo)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-on-background">
                          {session.navegador} {t('En')}{' '}
                          {session.sistema}
                        </h3>
                        {session.es_actual && (
                          <span className="px-2 py-0.5 text-xs bg-primary text-on-primary rounded-full">
                            {t('SesiónActual')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-on-surface1">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          <span>{session.dispositivo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{session.ip || t('IpDesconocida')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {t('Iniciada')}{' '}
                            {formatDate(session.creado_en)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón cerrar */}
                  {!session.es_actual && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={actionLoading === session.id}
                    >
                      {actionLoading === session.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-1" />
                          {t('Cerrar')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info adicional */}
        <div className="mt-8 p-4 bg-surface2 rounded-lg border border-border">
          <h4 className="font-medium text-on-background flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('Parrafo6')}
          </h4>
          <p className="mt-1 text-sm text-on-surface1">
            {t('Parrafo1')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sessions;

