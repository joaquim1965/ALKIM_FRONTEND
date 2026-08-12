/**
 * ForgotPassword.jsx
 *
 * Página para solicitar reset de contraseña
 * El usuario ingresa su email y recibe un link para resetear su contraseña
 */

import { useState } from 'react';
import { useTmTr } from '../contexts/TmTrContext';

import { Button } from '../components/UI/Button';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const translations = new Proxy({}, { get: (_, prop) => prop });


const ForgotPassword = () => {
  const { t } = useTmTr('ForgotPassword');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || t('Parrafo2'));
      }
    } catch (err) {
      setError(t('Parrafo2'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-6 text-3xl font-bold text-on-background">
              {t('Parrafo5')}
            </h2>
            <p className="mt-2 text-sm text-on-surface2">
              {t('Parrafo2')}
            </p>
          </div>

          <Link to="/login" className="flex items-center justify-center gap-2 text-link hover:text-link-hover">
            <ArrowLeft className="h-4 w-4" />
            {t('Parrafo2')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-on-background">
            {t('Parrafo1')}
          </h2>
          <p className="mt-2 text-sm text-on-surface2">
            {t('Parrafo2')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-on-background">
              {t('Email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-input text-on-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input-focus"
              placeholder={t('Tuemailcom')}
            />
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
            {loading ? t('Enviando') : t('Parrafo2')}
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-link hover:text-link-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Parrafo2')}
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;

