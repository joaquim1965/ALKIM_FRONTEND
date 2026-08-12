/**
 * ResetPassword.jsx
 *
 * Página para restablecer contraseña usando token
 * El usuario llega aquí desde el link del email
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTmTr } from '../contexts/TmTrContext';

import { Button } from '../components/UI/Button';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const translations = new Proxy({}, { get: (_, prop) => prop });


const ResetPassword = () => {
  const { t } = useTmTr('ResetPassword');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validar token al cargar la página
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      setError(t('Parrafo1'));
      setValidating(false);
      return;
    }

    setToken(urlToken);
    validateToken(urlToken);
  }, [searchParams]);

  const validateToken = async (tokenToValidate) => {
    try {
      const response = await fetch(`http://localhost:3000/auth/validate-reset-token/${tokenToValidate}`);
      const data = await response.json();

      if (response.ok) {
        setTokenValid(true);
      } else {
        setError(data.message || t('Parrafo1'));
      }
    } catch (err) {
      setError(t('Parrafo1'));
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (password.length < 8) {
      setError(t('Parrafo1'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Parrafo1'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || t('Parrafo1'));
      }
    } catch (err) {
      setError(t('Parrafo1'));
    } finally {
      setLoading(false);
    }
  };

  // Estado de carga mientras valida el token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface2">{t('ValidandoEnlace')}</p>
        </div>
      </div>
    );
  }

  // Mostrar éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h2 className="text-3xl font-bold text-on-background">
            {t('ContraseñaActualizada')}
          </h2>
          <p className="text-on-surface2">
            {t('Parrafo1')}
          </p>
        </div>
      </div>
    );
  }

  // Token inválido o expirado
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <XCircle className="mx-auto h-16 w-16 text-destructive" />
          <h2 className="text-3xl font-bold text-on-background">
            {t('Parrafo1')}
          </h2>
          <p className="text-on-surface2">{error}</p>
          <Button onClick={() => navigate('/forgot-password')}>
            {t('Parrafo13')}
          </Button>
        </div>
      </div>
    );
  }

  // Formulario de reset
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold text-on-background">
            {t('RestablecerContraseña')}
          </h2>
          <p className="mt-2 text-sm text-on-surface2">
            {t('Parrafo1')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Nueva contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-on-background">
              {t('NuevaContraseña')}
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 bg-input text-on-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input-focus"
                placeholder={t('Parrafo2')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface2 hover:text-on-background"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-on-surface2">
              {t('Parrafo2')}
            </p>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-on-background">
              {t('ConfirmarContraseña')}
            </label>
            <div className="mt-1 relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-2 pr-10 bg-input text-on-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input-focus"
                placeholder={t('Parrafo4')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface2 hover:text-on-background"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive text-on-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('Actualizando') : t('RestablecerContraseña')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

