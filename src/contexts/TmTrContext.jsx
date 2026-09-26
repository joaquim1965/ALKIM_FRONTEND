import { createContext, useContext, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { ExtractosTranslations } from '../translations/Extractos';
import { ExtractosLogTranslations } from '../translations/ExtractosLog';
import { ProgramacionTranslations } from '../translations/Programacion';
import { EditorSecuenciaTranslations } from '../translations/EditorSecuencia';
import { AltaCuentaTranslations } from '../translations/AltaCuenta';
import { VisorExtractosTranslations } from '../translations/VisorExtractos';
import { BancosCuentasTranslations } from '../translations/BancosCuentas';
import { MovimientosTranslations } from '../translations/Movimientos';
import { SaldoTranslations } from '../translations/Saldo';
import { LoginTranslations } from '../translations/Login';

// ══════════════════════════════════════════════════
// 📦 CREAR CONTEXTO
// ══════════════════════════════════════════════════

const TmTrContext = createContext(undefined);

// Traducciones que viajan con el código. Son la red de seguridad de cada
// pantalla: si una clave todavía no está en `s_dictionary` —o la base de datos
// no responde— el texto sale igualmente en el idioma elegido, en vez de
// enseñar el nombre de la clave. La base de datos, cuando tiene la clave,
// manda: así se puede corregir una traducción sin tocar el código.
const STATIC_PAGE_TRANSLATIONS = {
  Extractos: ExtractosTranslations,
  ExtractosLog: ExtractosLogTranslations,
  Programacion: ProgramacionTranslations,
  EditorSecuencia: EditorSecuenciaTranslations,
  AltaCuenta: AltaCuentaTranslations,
  VisorExtractos: VisorExtractosTranslations,
  BancosCuentas: BancosCuentasTranslations,
  Movimientos: MovimientosTranslations,
  Saldo: SaldoTranslations,
  Login: LoginTranslations,
};

const LANGUAGE_FIELD = {
  es: 'spanish',
  en: 'english',
  ca: 'catalan',
  fr: 'french',
};

// ══════════════════════════════════════════════════
// 🎨 PROVIDER
// ══════════════════════════════════════════════════

export function TmTrProvider({ children }) {
  const { theme, themeVariables, language, dictionary, setTheme, setThemeVariables, setLanguage, fetchLanguage } = useStore();

  // AL INICIAR: Forzamos la carga del idioma inicial desde la DB
  useEffect(() => {
    fetchLanguage(language);
  }, [language, fetchLanguage]);

  // Fallback a algunas traducciones duras en caso de que la DB de los Temas aún no esté
  const defaultThemes = {
    themes: {
      light: "Claro", dark: "Oscuro", "high-contrast": "Alto Contraste"
    }
  };

  const value = {
    theme,           // 'light' | 'dark' | 'high-contrast'
    themeVariables,  // Objeto con variables dinámicas
    language,        // 'es' | 'en' | 'fr' | 'ca'
    tr: { ...defaultThemes, ...dictionary }, // Diccionario plano
    setTheme,
    setThemeVariables,
    setLanguage,
  };

  return (
    <TmTrContext.Provider value={value}>
      {children}
    </TmTrContext.Provider>
  );
}

// ══════════════════════════════════════════════════
// 🪝 HOOK
// ══════════════════════════════════════════════════

/**
 * useTmTr
 * 
 * @param {string} [pageName] - Opcional. Ya no se requieren traducciones separadas.
 * Pero se manda función `t` que extrae del diccionario plano `tr` de Zustand para 
 * mantener retrocompatibilidad o proveer un Helper extra.
 */
export function useTmTr(pageName) {
  const context = useContext(TmTrContext);

  if (context === undefined) {
    throw new Error('useTmTr debe usarse dentro de <TmTrProvider>');
  }

  // Helper t(key, fallback) que busca primero con prefijo de página y luego global
  const t = (key, fallback) => {
    if (typeof key !== 'string') return '';

    let val = null;

    // 1. Intentar con prefijo de página si existe: "Page:key"
    if (pageName) {
      const pageKey = `${pageName}:${key}`;
      if (context.tr[pageKey]) val = context.tr[pageKey];

      // Fallback de módulos aún no cargados en s_dictionary.
      // Debe tener prioridad sobre claves globales como "title".
      if (!val) {
        const staticEntry = STATIC_PAGE_TRANSLATIONS[pageName]?.[key];
        const languageField = LANGUAGE_FIELD[context.language] || LANGUAGE_FIELD.es;
        if (staticEntry?.[languageField]) val = staticEntry[languageField];
      }
    }

    // 2. Intentar clave directa (global)
    if (!val && context.tr[key]) val = context.tr[key];

    // 3. Fallback: devolver el valor encontrado, el fallback proporcionado o la clave
    return val || fallback || key;
  };

  return {
    ...context,
    t
  };
}

export default TmTrContext;
