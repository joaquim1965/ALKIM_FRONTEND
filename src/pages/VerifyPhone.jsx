/**
 * VerifyPhone.jsx
 * Pagina de verificacion de telefono con Firebase
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTmTr } from '../contexts/TmTrContext';
import { useStore } from '../hooks/useStore';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import usePhoneVerification from '../hooks/usePhoneVerification';

const VerifyPhone = () => {
  const navigate = useNavigate();
  const { tm } = useTmTr();
  const { user, updateUser, accessToken } = useStore();

  const {
    loading,
    error,
    codeSent,
    initRecaptcha,
    sendVerificationCode,
    verifyCode,
    reset
  } = usePhoneVerification();

  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [backendError, setBackendError] = useState(null);

  // Inicializar reCAPTCHA al montar
  useEffect(() => {
    // Pequeno delay para asegurar que el DOM esta listo
    const timer = setTimeout(() => {
      initRecaptcha('recaptcha-container', 'invisible');
    }, 500);

    return () => {
      clearTimeout(timer);
      // Limpiar al desmontar
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignorar
        }
      }
    };
  }, [initRecaptcha]);

  // Countdown para reenvio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Formatear numero de telefono
  const formatPhoneNumber = () => {
    if (!user?.prefijo_tel || !user?.telefono) return null;
    return `${user.prefijo_tel}${user.telefono}`.replace(/\s/g, '');
  };

  // Enviar codigo
  const handleSendCode = async () => {
    setBackendError(null);
    const phoneNumber = formatPhoneNumber();

    if (!phoneNumber) {
      setBackendError('No tienes numero de telefono registrado');
      return;
    }

    const result = await sendVerificationCode(phoneNumber);

    if (result.success) {
      setCountdown(60); // 60 segundos para reenviar
    }
  };

  // Verificar codigo
  const handleVerify = async (e) => {
    e.preventDefault();
    setBackendError(null);

    const result = await verifyCode(code);

    if (result.success) {
      // Notificar al backend
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/confirm-phone-verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          credentials: 'include',
          body: JSON.stringify({
            firebaseToken: result.idToken,
            phoneNumber: result.user.phoneNumber
          })
        });

        const data = await response.json();

        if (data.success) {
          setSuccess(true);
          updateUser({ verif_tel: 1 });

          // Redirigir despues de 2 segundos
          setTimeout(() => navigate('/control-panel'), 2000);
        } else {
          setBackendError(data.message || 'Error al confirmar verificacion');
        }
      } catch (err) {
        console.error('Error notificando al backend:', err);
        setBackendError('Error de conexion. Intenta de nuevo.');
      }
    }
  };

  // Manejar cambio en input de codigo
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  // Si ya esta verificado
  if (Number(user?.verif_tel) === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-surface1 rounded-lg p-6 text-center shadow-lg">
          <span className="text-5xl">✅</span>
          <h2 className="text-xl font-bold mt-4 text-on-surface1">Telefono Verificado</h2>
          <p className="text-on-surface2 mt-2">
            {user.prefijo_tel} {user.telefono}
          </p>
          <Button onClick={() => navigate('/control-panel')} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  // Estado de exito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-surface1 rounded-lg p-6 text-center shadow-lg">
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold mt-4 text-success">Verificacion Exitosa!</h2>
          <p className="text-on-surface2 mt-2">
            Tu numero de telefono ha sido verificado correctamente.
          </p>
          <p className="text-sm text-on-surface2 mt-4">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-surface1 rounded-lg p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-on-surface1">
          Verificar Telefono
        </h1>

        {/* Numero de telefono */}
        {user?.telefono && (
          <div className="bg-surface2 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-on-surface2">Tu numero</p>
            <p className="text-xl font-mono font-bold text-on-surface1">
              {user?.prefijo_tel} {user?.telefono}
            </p>
          </div>
        )}

        {/* Mensajes de error */}
        {(error || backendError) && (
          <div className="bg-destructive border border-destructive text-on-destructive rounded-lg p-3 mb-4 text-sm font-medium">
            {error || backendError}
          </div>
        )}

        {/* Contenedor invisible para reCAPTCHA */}
        <div id="recaptcha-container"></div>

        {!codeSent ? (
          /* Paso 1: Enviar codigo */
          <div className="space-y-4">
            <p className="text-center text-on-surface2">
              Te enviaremos un SMS con un codigo de verificacion de 6 digitos.
            </p>
            <Button
              onClick={handleSendCode}
              disabled={loading || !user?.telefono}
              className="w-full"
            >
              {loading ? 'Enviando...' : 'Enviar codigo SMS'}
            </Button>

            {!user?.telefono && (
              <p className="text-center text-sm text-warning">
                No tienes numero de telefono registrado en tu perfil.
              </p>
            )}
          </div>
        ) : (
          /* Paso 2: Introducir codigo */
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-on-surface1">
                Codigo de verificacion
              </label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={error}
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                className="text-center tracking-widest text-lg"
              />
              <p className="text-xs text-on-surface2 mt-2 text-center">
                Introduce el codigo de 6 digitos que recibiste
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full"
            >
              {loading ? 'Verificando...' : 'Verificar codigo'}
            </Button>

            {/* Reenviar codigo */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setCode('');
                  setBackendError(null);
                  // Reinicializar reCAPTCHA
                  setTimeout(() => {
                    initRecaptcha('recaptcha-container', 'invisible');
                  }, 100);
                }}
                disabled={countdown > 0}
                className="text-sm text-link hover:text-link-hover disabled:text-disabled disabled:cursor-not-allowed"
              >
                {countdown > 0
                  ? `Reenviar codigo en ${countdown}s`
                  : '← Volver a enviar codigo'}
              </button>
            </div>
          </form>
        )}

        {/* Info adicional */}
        <p className="text-xs text-center text-on-surface2 mt-6">
          El codigo expira en 10 minutos.
          <br />
          Asegurate de que tu numero sea correcto.
        </p>

        {/* Boton volver */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-link hover:text-link-hover"
          >
            ← Volver atras
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyPhone;
