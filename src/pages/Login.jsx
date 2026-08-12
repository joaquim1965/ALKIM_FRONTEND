/**
 * Login.jsx
 *
 * Página de inicio de sesión
 * Formulario de login con validación usando React Hook Form y Zod
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useTmTr } from '../contexts/TmTrContext';
import { useStore } from '../hooks/useStore';
import { loginSchema } from '../validations/authSchemas';
import authService from '../services/authService';
import { FormInput } from '../components/UI/FormInput';
import { FormCheckbox } from '../components/UI/FormCheckbox';
import { PasswordInput } from '../components/UI/PasswordInput';
import { Button } from '../components/UI/Button';
import { Mail } from 'lucide-react';

const Login = () => {
  const { t } = useTmTr('Login');
  const navigate = useNavigate();
  const { login: loginStore } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  // Configurar React Hook Form con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',              // Validar cuando sale del campo
    reValidateMode: 'onChange',   // Re-validar mientras escribe (después del primer blur)
    criteriaMode: 'firstError',   // Mostrar solo el primer error por campo
    shouldFocusError: true,       // Enfocar automáticamente en el campo con error
    defaultValues: {
      emailOrUsername: '',
      password: '',
      rememberMe: false,
    },
  });

  // Handler del formulario
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    setAttemptsRemaining(null);

    try {
      // Llamar al servicio de login
      const response = await authService.login(
        data.emailOrUsername,
        data.password,
        data.rememberMe
      );

      // Actualizar estado de autenticación en el store
      if (response.data?.user) {
        loginStore(response.data.user);
      }

      // Login exitoso - redirigir a consola
      navigate('/consola');
    } catch (error) {
      console.error('Error al iniciar sesión:', error);

      // Manejar errores específicos
      if (error.status === 429) {
        const minutes = error.retryAfter || error.message.match(/(\d+)\s*minutos/i)?.[1];
        setServerError(minutes
          ? `Demasiados intentos. Espera ${minutes} minutos antes de volver a intentarlo.`
          : (error.message || 'Demasiados intentos. Espera antes de volver a intentarlo.'));
      } else if (error.message.includes('Credenciales invalidas')) {
        setServerError(t('Parrafo9') || "Email/usuario o contraseña incorrectos");

        // Extraer intentos restantes si están en el mensaje
        const remaining = error.details?.intentosRestantes;
        if (Number.isInteger(remaining)) {
          setAttemptsRemaining(remaining);
        }
      } else if (
        error.message.includes('Cuenta bloqueada') ||
        error.message.includes('bloqueada temporalmente')
      ) {
        setServerError(t('Parrafo10') || "Cuenta bloqueada temporalmente");
      } else {
        setServerError(error.message || t('Parrafo8') || "Error al iniciar sesión");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-on-background">
            {t('IniciarSesion')}
          </h1>
          <p className="mt-2 text-lg text-on-surface1">
            {t('Parrafo1')}
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-surface1 shadow-lg rounded-lg p-8 border border-border">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="on">
            {/* Error del servidor */}
            {serverError && (
              <div className="bg-destructive text-on-destructive px-4 py-3 rounded-md text-sm">
                <p>{serverError}</p>
                {attemptsRemaining !== null && (
                  <p className="mt-1">
                    {t('IntentosRestantes')} {attemptsRemaining}
                  </p>
                )}
              </div>
            )}

            {/* Email o Usuario */}
            <FormInput
              name="emailOrUsername"
              label={t('Parrafo2')}
              placeholder={t('Parrafo3')}
              leftIcon={<Mail size={18} />}
              autoComplete="username"
              register={register}
              errors={errors}
              required
            />

            {/* Contraseña */}
            <div>
              <PasswordInput
                name="password"
                label={t('Contraseña')}
                placeholder={t('TuContraseña')}
                autoComplete="current-password"
                register={register("password")}
                errors={errors}
                required
              />

              {/* Link olvidé contraseña */}
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-link hover:text-link-hover"
                >
                  {t('Parrafo5')}
                </Link>
              </div>
            </div>

            {/* Recordar sesión */}
            <FormCheckbox
              name="rememberMe"
              label={t('Parrafo4')}
              register={register}
              errors={errors}
            />

            {/* Botón de envío */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting
                ? t('IniciandoSesión')
                : t('IniciarSesion')}
            </Button>
          </form>

          {/* Link a registro */}
          <div className="mt-6 text-center text-sm">
            <span className="text-on-surface1">
              {t('Parrafo6')}{' '}
            </span>
            <Link
              to="/register"
              className="text-link hover:text-link-hover font-medium"
            >
              {t('Regístrate')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
