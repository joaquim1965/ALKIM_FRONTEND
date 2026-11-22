/**
 * ErrorLecturaIa — ventana «No se ha podido leer el documento» (20/11/2026, petición del usuario).
 *
 * Cuando una lectura con IA falla, services/api.js llama a `window.__errorLecturaIa({ mensaje })`.
 * Se enseña el error con dos botones: «Cerrar» y «Cambiar modelo», que lleva a Auxiliares ▸
 * Claves de IA (/aux/ia) para elegir otro proveedor predeterminado.
 * No sale si la IA estaba saturada y el usuario canceló la ventana ElegirIa (eso ya lo decidió él).
 *
 * Montada una vez en App.jsx, dentro del Router (usa useNavigate).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Settings2, X } from 'lucide-react';
import Button from '../UI/Button';
import { VentanaModal, AvisoError, Ayuda } from '../UI/TemaPagina';
import { useTmTr } from '../../contexts/TmTrContext';

export default function ErrorLecturaIa() {
  const { t } = useTmTr('Ia');
  const navigate = useNavigate();
  const [error, setError] = useState(null);   // { mensaje }

  useEffect(() => {
    window.__errorLecturaIa = (datos) => setError(datos);
    return () => { delete window.__errorLecturaIa; };
  }, []);

  if (!error) return null;
  const cerrar = () => setError(null);

  return (
    <VentanaModal titulo={t('error_lectura_titulo', 'No se ha podido leer el documento')} icono={<AlertTriangle size={20} />} onCerrar={cerrar} ancho="max-w-xl">
      <div className="space-y-4">
        <AvisoError><span className="select-text">{error.mensaje}</span></AvisoError>
        <Ayuda>{t('error_lectura_texto', 'Puedes volver a intentarlo o elegir otro modelo de IA en la página de claves.')}</Ayuda>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" leftIcon={<X size={16} />} onClick={cerrar}>{t('cerrar', 'Cerrar')}</Button>
          <Button type="button" leftIcon={<Settings2 size={16} />} onClick={() => { cerrar(); navigate('/aux/ia'); }}>
            {t('cambiar_modelo', 'Cambiar modelo')}
          </Button>
        </div>
      </div>
    </VentanaModal>
  );
}
