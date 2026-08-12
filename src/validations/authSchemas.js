/**
 * authSchemas.js (Frontend Version)
 *
 * Esquemas de validacion Zod para autenticacion y gestion de usuarios
 * Adaptado a ES Modules para compatibilidad con Vite React Frontend
 */

import { z } from 'zod';

// ============================================================================
// MENSAJES DE ERROR PERSONALIZADOS (Español)
// ============================================================================

export const errorMessages = {
  required: 'Este campo es obligatorio',
  invalidEmail: 'Email invalido',
  invalidFormat: 'Formato invalido',
  tooShort: (min) => `Debe tener al menos ${min} caracteres`,
  tooLong: (max) => `Debe tener maximo ${max} caracteres`,
  invalidPhone: 'Numero de telefono invalido',
  weakPassword: 'La contraseña es muy debil',
  passwordMismatch: 'Las contraseñas no coinciden',
};

// ============================================================================
// ESQUEMAS REUTILIZABLES
// ============================================================================

/**
 * Validador de nombre (nombre, apellido)
 */
export const nombreSchema = z
  .string({ required_error: errorMessages.required })
  .min(2, { message: errorMessages.tooShort(2) })
  .max(60, { message: errorMessages.tooLong(60) })
  .regex(/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s-]+$/, {
    message: 'Solo se permiten letras, espacios y guiones',
  })
  .trim();

/**
 * Validador de usuario (username)
 */
export const usuarioSchema = z
  .string({ required_error: errorMessages.required })
  .min(3, { message: errorMessages.tooShort(3) })
  .max(30, { message: errorMessages.tooLong(30) })
  .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, {
    message: 'Debe empezar con letra y solo contener letras, numeros, _ y .',
  })
  .trim()
  .toLowerCase();

/**
 * Validador de email
 */
export const emailSchema = z
  .string({ required_error: errorMessages.required })
  .email({ message: errorMessages.invalidEmail })
  .max(100, { message: errorMessages.tooLong(100) })
  .trim()
  .toLowerCase();

/**
 * Validador de contraseña
 */
export const passwordSchema = z
  .string({ required_error: errorMessages.required })
  .min(8, { message: errorMessages.tooShort(8) })
  .max(100, { message: errorMessages.tooLong(100) })
  .regex(/[A-Z]/, { message: 'Debe contener al menos una mayuscula' })
  .regex(/[a-z]/, { message: 'Debe contener al menos una minuscula' })
  .regex(/[0-9]/, { message: 'Debe contener al menos un numero' })
  .regex(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Debe contener al menos un caracter especial (!@#$%^&*...)',
  });

/**
 * Validador de telefono
 */
export const telefonoSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^[0-9]{7,20}$/, { message: errorMessages.invalidPhone })
  .trim();

/**
 * Validador de prefijo telefonico
 */
export const prefijoTelefonoSchema = z
  .string({ required_error: errorMessages.required })
  .regex(/^\+[0-9]{1,4}$/, { message: 'Formato: +XX (ej: +34, +1)' })
  .trim();

// ============================================================================
// ESQUEMA DE REGISTRO
// ============================================================================

export const registerSchema = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  usuario: usuarioSchema,
  email: emailSchema,
  password: passwordSchema,
  grupo: z.string().min(5, { message: 'Debe tener al menos 5 caracteres' }).max(15, { message: 'Debe tener máximo 15 caracteres' }).toUpperCase()
});

export const registerSchemaWithConfirm = z
  .object({
    nombre: nombreSchema,
    apellido: nombreSchema,
    usuario: usuarioSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: passwordSchema,
    grupo: z.string().min(5, { message: 'Debe tener al menos 5 caracteres' }).max(15, { message: 'Debe tener máximo 15 caracteres' }).toUpperCase(),
    emailConfirm: emailSchema,
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'Debe aceptar los términos',
    })
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: errorMessages.passwordMismatch,
    path: ['passwordConfirm'],
  })
  .refine((data) => data.email === data.emailConfirm, {
    message: 'Los emails no coinciden',
    path: ['emailConfirm'],
  });

// ============================================================================
// ESQUEMA DE LOGIN
// ============================================================================

export const loginSchema = z.object({
  emailOrUsername: z
    .string({ required_error: errorMessages.required })
    .min(3, { message: errorMessages.tooShort(3) })
    .trim(),
  password: z
    .string({ required_error: errorMessages.required })
    .min(1, { message: 'La contraseña es obligatoria' }),
  rememberMe: z.boolean().optional().default(false),
});

// ============================================================================
// ESQUEMA DE CAMBIO DE CONTRASEÑA
// ============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: errorMessages.required })
      .min(1, { message: 'La contraseña actual es obligatoria' }),
    newPassword: passwordSchema,
    newPasswordConfirm: passwordSchema,
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: errorMessages.passwordMismatch,
    path: ['newPasswordConfirm'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

// ============================================================================
// ESQUEMA DE CAMBIO DE EMAIL
// ============================================================================

export const changeEmailSchema = z.object({
  password: z
    .string({ required_error: errorMessages.required })
    .min(1, { message: 'La contraseña es obligatoria' }),
  newEmail: emailSchema,
});

// ============================================================================
// ESQUEMA DE CAMBIO DE TELEFONO
// ============================================================================

export const changePhoneSchema = z.object({
  password: z
    .string({ required_error: errorMessages.required })
    .min(1, { message: 'La contraseña es obligatoria' }),
  prefijo_tel: prefijoTelefonoSchema,
  telefono: telefonoSchema,
});

// ============================================================================
// ESQUEMA DE RECUPERACION DE CONTRASEÑA
// ============================================================================

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Token es obligatorio' }),
    newPassword: passwordSchema,
    newPasswordConfirm: passwordSchema,
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: errorMessages.passwordMismatch,
    path: ['newPasswordConfirm'],
  });

// ============================================================================
// ESQUEMA DE ACTUALIZACION DE PERFIL
// ============================================================================

export const updateProfileSchema = z.object({
  nombre: nombreSchema.optional(),
  apellido: nombreSchema.optional(),
  telefono: telefonoSchema.optional().or(z.literal('')),
  red: z.string().max(100).optional().or(z.literal('')),
  idioma: z.number().int().min(1).max(255).optional(),
  tema: z.number().int().min(1).max(255).optional(),
  zona_horaria: z.number().int().min(1).optional(),
  pais: z.string().length(2).optional(),
});
