/**
 * Register.jsx
 *
 * Página de registro de usuarios
 * Formulario completo con validación usando React Hook Form y Zod
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useTmTr } from '../contexts/TmTrContext';
import { useStore } from '../hooks/useStore';

import { registerSchemaWithConfirm } from '../validations/authSchemas';
import authService from '../services/authService';
import { FormInput } from '../components/UI/FormInput';
import { FormCheckbox } from '../components/UI/FormCheckbox';
import { PasswordStrength } from '../components/UI/PasswordStrength';
import { PasswordInput } from '../components/UI/PasswordInput';
import { Button } from '../components/UI/Button';
import { TermsModal } from '../components/UI/TermsModal';
import termsAndConditions from '../data/termsAndConditions';
import { User, Mail, UserCircle, CheckCircle2 } from 'lucide-react';

const translations = new Proxy({}, { get: (_, prop) => prop });


const Register = () => {
  const { t, language } = useTmTr('Register');
  const navigate = useNavigate();
  const { login, theme } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [password, setPassword] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Obtener términos según el idioma
  const terms = language === 'es' ? termsAndConditions.spanish : termsAndConditions.english;

  // Configurar React Hook Form con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    watch,
  } = useForm({
    resolver: zodResolver(registerSchemaWithConfirm),
    mode: 'onChange',             // Validar mientras escribe (para activar botón en tiempo real)
    reValidateMode: 'onChange',   // Re-validar mientras escribe
    criteriaMode: 'firstError',   // Mostrar solo el primer error por campo
    shouldFocusError: true,       // Enfocar automáticamente en el campo con error
    defaultValues: {
      nombre: '',
      apellido: '',
      usuario: '',
      email: '',
      emailConfirm: '',
      password: '',
      passwordConfirm: '',
      grupo: '',
      acceptTerms: false,
    },
  });

  // Observar el campo password para el indicador de fortaleza
  const watchPassword = watch('password', '');

  // Observar acceptTerms para habilitar/deshabilitar botón
  const watchAcceptTerms = watch('acceptTerms', false);

  // Handler del formulario
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      // Eliminar campos de confirmación antes de enviar (solo se usan para validación)
      const { passwordConfirm, emailConfirm, acceptTerms, ...userData } = data;

      // Añadir idioma y tema actuales de forma transparente (no mostrar al usuario)
      userData.idiomaPreferido = language;
      userData.temaPreferido = theme;

      // Llamar al servicio de registro
      const response = await authService.register(userData);

      // Verificar si requiere verificación de email
      if (response.data?.requiresVerification) {
        setRegisteredEmail(response.data.user?.email || data.email);
        setRegistrationSuccess(true);
      } else if (response.data?.user && response.data?.accessToken) {
        // Login automático si no requiere verificación (compatibilidad)
        login(response.data.user);
        navigate('/control-panel');
      }
    } catch (error) {
      console.error('Error al registrar:', error);

      // Manejar errores específicos
      if (error.message.includes('email ya esta registrado')) {
        setServerError(t('Parrafo4'));
      } else if (error.message.includes('usuario ya esta en uso')) {
        setServerError(t('Parrafo4'));
      } else {
        setServerError(t('Parrafo4'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pantalla de éxito - Verificar email
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h2 className="text-3xl font-bold text-on-background">
            {t('RegistroExitoso')}
          </h2>
          <p className="text-on-surface2">
            {t('Parrafo4')}
          </p>
          <p className="text-sm text-on-surface2">
            {t('Parrafo4')} <strong>{registeredEmail}</strong>
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="text-link hover:text-link-hover font-medium"
            >
              {t('Parrafo4')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-on-background">
            {t('CrearCuenta')}
          </h1>
          <p className="mt-2 text-lg text-on-surface1">
            {t('Parrafo1')}
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-surface1 shadow-lg rounded-lg p-8 border border-border">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error del servidor */}
            {serverError && (
              <div className="bg-destructive text-on-destructive px-4 py-3 rounded-md text-sm">
                {serverError}
              </div>
            )}

            {/* Fila: Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="nombre"
                label={t('Nombre')}
                placeholder={t('TuNombre')}
                leftIcon={<User size={18} />}
                register={register}
                errors={errors}
                required
              />

              <FormInput
                name="apellido"
                label={t('Apellidos')}
                placeholder={t('TusApellidos')}
                leftIcon={<User size={18} />}
                register={register}
                errors={errors}
                required
              />
            </div>

            {/* Fila: Usuario y Grupo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="usuario"
                label={t('Parrafo2') || 'Nombre de usuario'}
                placeholder={t('Usuario123') || 'usuario123'}
                leftIcon={<UserCircle size={18} />}
                register={register}
                errors={errors}
                required
              />
              <FormInput
                name="grupo"
                label={t('Grupoempresa') || 'Grupo/Empresa (Código Único)'}
                placeholder="Ej: ALKIM"
                leftIcon={<UserCircle size={18} />}
                register={register}
                errors={errors}
                required
              />
            </div>

            {/* Email */}
            <FormInput
              name="email"
              type="email"
              label={t('CorreoElectrónico')}
              placeholder={t('Tuemailcom')}
              leftIcon={<Mail size={18} />}
              register={register}
              errors={errors}
              required
            />

            {/* Confirmar Email */}
            <FormInput
              name="emailConfirm"
              type="email"
              label={t('Parrafo3')}
              placeholder={t('Parrafo4')}
              leftIcon={<Mail size={18} />}
              register={register}
              errors={errors}
              required
            />

            {/* Fila: Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <PasswordInput
                  name="password"
                  label={t('Contraseña')}
                  placeholder={t('Parrafo5')}
                  register={register('password')}
                  errors={errors}
                  required
                />
                {/* Indicador de fortaleza de contraseña */}
                <PasswordStrength password={watchPassword} />
              </div>

              <PasswordInput
                name="passwordConfirm"
                label={t('ConfirmarContraseña')}
                placeholder={t('Parrafo6')}
                register={register('passwordConfirm')}
                errors={errors}
                required
              />
            </div>

            {/* Términos y condiciones */}
            <FormCheckbox
              name="acceptTerms"
              label={
                <span>
                  {language === 'es' ? 'Acepto los ' : 'I accept the '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-link hover:text-link-hover underline font-medium"
                  >
                    {language === 'es' ? 'términos y condiciones' : 'terms and conditions'}
                  </button>
                </span>
              }
              register={register}
              errors={errors}
              required
            />

            {/* Botón de envío */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting
                ? t('Registrando')
                : t('Registrarse')}
            </Button>
          </form>

          {/* Link a login */}
          <div className="mt-6 text-center text-sm">
            <span className="text-on-surface1">
              {t('Parrafo4')}{' '}
            </span>
            <Link
              to="/login"
              className="text-link hover:text-link-hover font-medium"
            >
              {t('IniciaSesión')}
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Términos y Condiciones */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        terms={terms}
      />
    </div>
  );
};

export default Register;

