/**
 * VerifyEmail.jsx
 *
 * Página para verificar email usando token
 * El usuario llega aquí desde el link del email de verificación
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTmTr } from '../contexts/TmTrContext';

import authService from '../services/authService';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { CheckCircle2, XCircle, Mail, Loader2, ArrowLeft } from 'lucide-react';

const translations = new Proxy({}, { get: (_, prop) => prop });


const VerifyEmail = () => {
  const { t } = useTmTr('VerifyEmail');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('verifying'); // verifying, success, error, resending
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  // Verificar token al cargar la página
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError(t('Parrafo2'));
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    try {
      await authService.verifyEmail(token);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      if (err.message === 'Failed to fetch') {
        setError(t('Parrafo2'));
      } else {
        setError(err.message || t('Parrafo2'));
      }
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setStatus('resending');

    try {
      await authService.resendVerification(email);
      setStatus('resent');
    } catch (err) {
      setStatus('error');
      if (err.message === 'Failed to fetch') {
        setError(t('Parrafo2'));
      } else {
        setError(err.message || t('Parrafo2'));
      }
    }
  };

  // Estado: Verificando
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-on-surface2">{t('Parrafo1')}</p>
        </div>
      </div>
    );
  }

  // Estado: Éxito
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h2 className="text-3xl font-bold text-on-background">
            {t('EmailVerificado')}
          </h2>
          <p className="text-on-surface2">
            {t('Parrafo2')}
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            {t('Parrafo2')}
          </Button>
        </div>
      </div>
    );
  }

  // Estado: Email reenviado
  if (status === 'resent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <Mail className="mx-auto h-16 w-16 text-primary" />
          <h2 className="text-3xl font-bold text-on-background">
            {t('EmailEnviado')}
          </h2>
          <p className="text-on-surface2">
            {t('Parrafo2')}
          </p>
          <Link to="/login" className="text-link hover:text-link-hover">
            {t('Parrafo2')}
          </Link>
        </div>
      </div>
    );
  }

  // Estado: Reenviando
  if (status === 'resending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-on-surface2">{t('EnviandoEmail')}</p>
        </div>
      </div>
    );
  }

  // Estado: Error
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="text-3xl font-bold text-on-background">
          {t('Parrafo4')}
        </h2>
        <p className="text-on-surface2">{error}</p>

        {/* Formulario para reenviar email */}
        <div className="mt-8 space-y-4">
          <p className="text-sm text-on-surface2">
            {t('Parrafo2')}
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('Parrafo10')}
            className="w-full px-3 py-2 bg-input text-on-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input-focus"
          />
          <Button
            onClick={handleResendEmail}
            disabled={!email}
            className="w-full"
          >
            {t('Parrafo2')}
          </Button>
        </div>

        <Link to="/login" className="block text-link hover:text-link-hover">
          {t('Parrafo2')}
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;

