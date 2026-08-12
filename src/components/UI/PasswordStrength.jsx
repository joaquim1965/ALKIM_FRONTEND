/**
 * UI/PasswordStrength.jsx
 *
 * COMPONENTE UNIFICADO DE PASSWORD STRENGTH
 * Contiene dos versiones exportadas:
 *
 *   • PasswordStrengthRaw → Lógica pura de cálculo + presentación base (sin estilos de color).
 *   • PasswordStrength    → Componente estilizado con colores del sistema de diseño.
 *
 * CARACTERÍSTICAS:
 * ✅ 5 niveles de fortaleza (muy débil, débil, aceptable, fuerte, muy fuerte)
 * ✅ Scoring basado en longitud, variedad de caracteres y patrones
 * ✅ Penalizaciones por patrones inseguros (repetidos, secuencias, palabras comunes)
 * ✅ Feedback visual con lista de requisitos no cumplidos
 *
 * USO:
 * import PasswordStrength from '@/components/UI/PasswordStrength';
 * import { PasswordStrengthRaw } from '@/components/UI/PasswordStrength';
 *
 * <PasswordStrength password={password} />
 * <PasswordStrengthRaw password={password} className="my-custom-class" />
 */

import React, { useMemo } from 'react';

// ══════════════════════════════════════════════════
// 📦 LÓGICA DE CÁLCULO (compartida por ambas versiones)
// ══════════════════════════════════════════════════

/**
 * Calcular fortaleza de la contraseña
 * @param {string} password - Contraseña a evaluar
 * @returns {object} { score: number (0-5), feedback: string[], level: string }
 */
export const calculatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, feedback: [], level: 'empty' };
  }

  let score = 0;
  const feedback = [];

  // Longitud mínima
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Mínimo 8 caracteres');
  }

  // Longitud adicional
  if (password.length >= 12) {
    score += 1;
  }

  // Letras minúsculas
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta una letra minúscula');
  }

  // Letras mayúsculas
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta una letra mayúscula');
  }

  // Números
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta un número');
  }

  // Caracteres especiales
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta un carácter especial (!@#$%^&*...)');
  }

  // Penalizaciones
  if (/(.)\\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Evita caracteres repetidos consecutivos');
  }

  if (
    /123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(
      password
    )
  ) {
    score -= 1;
    feedback.push('Evita secuencias comunes (123, abc, etc.)');
  }

  const commonWords = ['password', 'contraseña', 'admin', 'user', 'test', 'qwerty', 'asdfgh'];
  if (commonWords.some((word) => password.toLowerCase().includes(word))) {
    score -= 1;
    feedback.push('Evita palabras comunes');
  }

  score = Math.max(0, Math.min(5, score));

  let level = 'muy débil';
  if (score >= 5) level = 'muy fuerte';
  else if (score >= 4) level = 'fuerte';
  else if (score >= 3) level = 'aceptable';
  else if (score >= 2) level = 'débil';

  return { score, feedback, level };
};

// ══════════════════════════════════════════════════
// 🔩 PASSWORDSTRENGTHRAW — Sin colores de variante
// ══════════════════════════════════════════════════

/**
 * PasswordStrengthRaw
 *
 * Componente "desnudo". Calcula y muestra la fortaleza de la contraseña
 * sin aplicar colores específicos. Pasa clases externas vía `className`.
 *
 * @param {object}   props
 * @param {string}   props.password              - Contraseña a evaluar
 * @param {boolean} [props.showFeedback=true]    - Mostrar feedback de requisitos
 * @param {string}  [props.strengthLabel]        - Etiqueta de fortaleza
 * @param {string}  [props.className]            - Clases CSS adicionales
 */
export function PasswordStrengthRaw({
  password,
  showFeedback = true,
  strengthLabel = 'Fortaleza de la contraseña:',
  className = '',
}) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  const barWidth = (strength.score / 5) * 100;

  return (
    <div className={`mt-2 space-y-2 ${className}`}>
      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs">{strengthLabel}</span>
          <span className="text-xs font-medium">{strength.level}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Feedback de requisitos */}
      {showFeedback && strength.feedback.length > 0 && (
        <ul className="space-y-1">
          {strength.feedback.map((item, index) => (
            <li key={index} className="text-xs flex items-start gap-1">
              <span className="mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// 🎨 PASSWORDSTRENGTH — Componente estilizado
// ══════════════════════════════════════════════════

/** Colores según score (0-5) */
const scoreColors = {
  0: { bar: 'bg-neutral', text: 'text-on-neutral' },
  1: { bar: 'bg-destructive', text: 'text-on-destructive' },
  2: { bar: 'bg-warning', text: 'text-on-warning' },
  3: { bar: 'bg-info', text: 'text-on-info' },
  4: { bar: 'bg-success', text: 'text-on-success' },
  5: { bar: 'bg-success', text: 'text-on-success' },
};

/**
 * PasswordStrength
 *
 * Componente estilizado completo. Aplica colores del sistema de diseño
 * según el nivel de fortaleza de la contraseña.
 *
 * @param {object}   props
 * @param {string}   props.password              - Contraseña a evaluar
 * @param {boolean} [props.showFeedback=true]    - Mostrar feedback de requisitos
 * @param {string}  [props.strengthLabel]        - Etiqueta de fortaleza
 * @param {string}  [props.className]            - Clases CSS adicionales
 */
export function PasswordStrength({
  password,
  showFeedback = true,
  strengthLabel = 'Fortaleza de la contraseña:',
  className = '',
}) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  const currentColor = scoreColors[strength.score] || scoreColors[0];
  const barWidth = (strength.score / 5) * 100;

  return (
    <div className={`mt-2 space-y-2 ${className}`}>
      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary">{strengthLabel}</span>
          <span className={`text-xs font-medium ${currentColor.text}`}>{strength.level}</span>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
          <div
            className={`h-full ${currentColor.bar} transition-all duration-300 ease-out`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Feedback de requisitos */}
      {showFeedback && strength.feedback.length > 0 && (
        <ul className="space-y-1">
          {strength.feedback.map((item, index) => (
            <li
              key={index}
              className="text-xs text-secondary flex items-start gap-1"
            >
              <span className="text-on-warning mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasswordStrength;
