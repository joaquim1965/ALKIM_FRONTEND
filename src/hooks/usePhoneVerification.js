/**
 * usePhoneVerification.js
 * Hook para verificacion de telefono con Firebase
 */

import { useState, useCallback } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const usePhoneVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [codeSent, setCodeSent] = useState(false);

  /**
   * Inicializar reCAPTCHA
   * @param {string} containerId - ID del elemento contenedor
   * @param {string} size - 'invisible' o 'normal'
   */
  const initRecaptcha = useCallback((containerId = 'recaptcha-container', size = 'invisible') => {
    try {
      // Limpiar verificador anterior si existe
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: size,
        callback: () => {
          console.log('reCAPTCHA resuelto');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expirado');
          setError('reCAPTCHA expirado. Intentalo de nuevo.');
        }
      });

      return window.recaptchaVerifier;
    } catch (err) {
      console.error('Error inicializando reCAPTCHA:', err);
      setError('Error al inicializar verificacion');
      return null;
    }
  }, []);

  /**
   * Enviar codigo SMS
   * @param {string} phoneNumber - Numero en formato internacional (+34612345678)
   */
  const sendVerificationCode = useCallback(async (phoneNumber) => {
    setLoading(true);
    setError(null);

    try {
      // Asegurar que reCAPTCHA esta inicializado
      if (!window.recaptchaVerifier) {
        initRecaptcha();
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        window.recaptchaVerifier
      );

      setVerificationId(confirmationResult.verificationId);
      setCodeSent(true);

      // Guardar para usar en verificacion
      window.confirmationResult = confirmationResult;

      return { success: true };
    } catch (err) {
      console.error('Error enviando SMS:', err);

      // Mensajes de error amigables
      let message = 'Error al enviar SMS';
      switch (err.code) {
        case 'auth/invalid-phone-number':
          message = 'Numero de telefono invalido';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos. Espera unos minutos.';
          break;
        case 'auth/quota-exceeded':
          message = 'Limite de SMS alcanzado. Contacta soporte.';
          break;
        case 'auth/captcha-check-failed':
          message = 'Error de verificacion. Recarga la pagina.';
          break;
        default:
          message = err.message;
      }

      setError(message);

      // Resetear reCAPTCHA en caso de error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (e) {
          // Ignorar errores al limpiar
        }
      }

      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [initRecaptcha]);

  /**
   * Verificar codigo SMS
   * @param {string} code - Codigo de 6 digitos
   */
  const verifyCode = useCallback(async (code) => {
    setLoading(true);
    setError(null);

    try {
      if (!window.confirmationResult) {
        throw new Error('No hay verificacion pendiente');
      }

      const result = await window.confirmationResult.confirm(code);

      // Usuario verificado exitosamente
      const user = result.user;

      // Obtener token para enviar al backend
      const idToken = await user.getIdToken();

      return {
        success: true,
        user: {
          uid: user.uid,
          phoneNumber: user.phoneNumber
        },
        idToken
      };
    } catch (err) {
      console.error('Error verificando codigo:', err);

      let message = 'Codigo incorrecto';
      switch (err.code) {
        case 'auth/invalid-verification-code':
          message = 'Codigo incorrecto. Verifica e intenta de nuevo.';
          break;
        case 'auth/code-expired':
          message = 'Codigo expirado. Solicita uno nuevo.';
          break;
        default:
          message = err.message || 'Error al verificar';
      }

      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Resetear estado
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setVerificationId(null);
    setCodeSent(false);
    window.confirmationResult = null;

    // Limpiar reCAPTCHA
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      } catch (e) {
        // Ignorar errores al limpiar
      }
    }
  }, []);

  return {
    loading,
    error,
    codeSent,
    verificationId,
    initRecaptcha,
    sendVerificationCode,
    verifyCode,
    reset
  };
};

export default usePhoneVerification;
