/**
 * PantallaRemotaPage.jsx — /pantalla-remota (27/09/2026).
 *
 * El navegador del servidor en una ventana aparte, a todo el tamaño: se abre
 * al grabar un guion desde app.alkim.es (ver PantallaRemota.jsx). La ventana
 * de ALKIM sigue con la lista de pasos y los botones de guardar y cancelar.
 * Al terminar la grabación, esta ventana se cierra sola.
 */
import React, { useEffect } from 'react';
import PantallaRemota from './PantallaRemota';
import { useTmTr } from '../../../contexts/TmTrContext';

const PantallaRemotaPage = () => {
  const { t } = useTmTr('Extractos');
  useEffect(() => {
    const antes = document.title;
    document.title = t('remote_screen_title', 'Navegador del servidor · ALKIM');
    return () => { document.title = antes; };
  }, [t]);

  return (
    <div className="fixed inset-0 z-[300] bg-background">
      <PantallaRemota onTerminada={() => window.close()} />
    </div>
  );
};

export default PantallaRemotaPage;
