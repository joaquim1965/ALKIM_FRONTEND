import { create } from 'zustand';

// Idiomas locales por defecto (fallback) para que la UI no rompa si la BD falla o no carga
const defaultTranslations = {
  en: { loading: "Loading Data..." },
  es: { loading: "Cargando Datos..." },
  fr: { loading: "Chargement..." },
  ca: { loading: "Carregant dades..." }
};

const supportedLanguages = ['en', 'es', 'fr', 'ca'];
 
const THEME_MAP = {
  1: 'light',
  2: 'dark',
  3: 'high-contrast',
  '1': 'light',
  '2': 'dark',
  '3': 'high-contrast'
};

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  let theme = 'dark';
  if (stored && ['light', 'dark', 'high-contrast'].includes(stored)) {
    theme = stored;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    theme = 'light';
  }

  // Aplicar atributo al document
  if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // APLICACIÓN INMEDIATA DE VARIABLES GUARDADAS (Evita el "flash" de tema por defecto)
  const savedVars = localStorage.getItem('customThemeVariables');
  if (savedVars) {
    try {
      const allVars = JSON.parse(savedVars);
      const currentVars = allVars[theme] || {};
      Object.entries(currentVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
    } catch (e) {
      console.error("[Store:getInitialTheme] Error aplicando variables iniciales:", e);
    }
  }

  if (!stored) localStorage.setItem('theme', theme);
  return theme;
};

const getInitialLanguage = () => {
  const stored = localStorage.getItem('language');
  if (stored && supportedLanguages.includes(stored)) {
    return stored;
  }
  const browserLang = navigator.language.split('-')[0];
  return supportedLanguages.includes(browserLang) ? browserLang : 'es';
};

// Intenta cargar un diccionario cacheado del localStorage inicial
const getInitialDictionary = (lang) => {
  try {
    const cached = localStorage.getItem(`i18n_dict_${lang}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Error leyendo caché de traducciones:", e);
  }
  // Fallback dictionary temporal
  return { "loading": "..." };
};

export const useStore = create((set, get) => ({
  theme: getInitialTheme(),
  themeVariables: { light: {}, dark: {}, 'high-contrast': {} }, // Variables EAV para todos los temas
  language: getInitialLanguage(),
  dictionary: getInitialDictionary(getInitialLanguage()),
  enums: JSON.parse(localStorage.getItem(`i18n_enums_${getInitialLanguage()}`) || '{}'),

  isAuthenticated: !!localStorage.getItem('accessToken'),
  sessionChecked: false,
  user: null,
  loading: false,
  error: null,

  // ==========================================
  // PERMISOS (Fase 1): mapa { tabla: nivel } + catálogo s_table
  // ==========================================
  permissions: {},          // { s_user: 'Full', m_ingresos: 'Read', ... }
  tablesCatalog: [],        // [{ tid, nombre, descripcion, modulo, icono, orden }]
  permissionsLoaded: false,

  /**
   * Cargar permisos del usuario actual desde /permissions/me.
   * Llamar tras login y al refrescar sesión (fetchMe).
   */
  loadPermissions: async () => {
    if (!get().isAuthenticated) return;
    try {
      const { getMyPermissions } = await import('../services/permissionsService');
      const res = await getMyPermissions();
      if (res.success) {
        set({
          permissions: res.permisos || {},
          tablesCatalog: res.tablas || [],
          permissionsLoaded: true,
        });
      }
    } catch (e) {
      console.error('[Store:loadPermissions] Error:', e);
      // Fail-closed: sin permisos cargados, can() devuelve false
      set({ permissions: {}, permissionsLoaded: false });
    }
  },

  /**
   * Helper de permisos: ¿tiene el usuario al menos `nivel` sobre `tabla`?
   * Niveles: None < Read < Write < Full. Sin registro = None (fail-closed).
   * @param {string} tabla
   * @param {'Read'|'Write'|'Full'} nivel
   * @returns {boolean}
   */
  can: (tabla, nivel = 'Read') => {
    const LEVELS = { None: 0, Read: 1, Write: 2, Full: 3 };
    const userLevel = get().permissions[tabla] || 'None';
    return (LEVELS[userLevel] || 0) >= (LEVELS[nivel] || 0);
  },

  fetchMe: async (force = false) => {
    if (!get().isAuthenticated || (get().user && !force)) return;
    set({ loading: true, error: null });
    try {
      const { getMe, refreshToken } = await import('../services/authService');
      let res;
      try {
        res = await getMe();
      } catch (error) {
        if (error.status !== 401) throw error;
        await refreshToken();
        res = await getMe();
      }
      if (res.success) {
        set({ user: res.data.user });
        if (res.data.user.tema) {
          const themeSlug = THEME_MAP[res.data.user.tema] || res.data.user.tema;
          get().setTheme(themeSlug);
        }
        // Cargar permisos junto con la sesión (Fase 1)
        get().loadPermissions();
      }
    } catch (e) {
      console.error("[Store:fetchMe] Error:", e);
      set({ error: e.message });
      // Si el error es de autenticación, limpiamos la sesión
      const errorMsg = e.message?.toLowerCase() || '';
      if (errorMsg.includes('token') || errorMsg.includes('expirado') || errorMsg.includes('unauthorized') || errorMsg.includes('no autorizado')) {
        get().logout();
      }
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Restaura la sesión desde la cookie HttpOnly al abrir o recargar la aplicación.
   * Funciona tanto si sigue vigente el access token como si debe renovarse.
   */
  restoreSession: async () => {
    set({ loading: true, error: null });
    try {
      const { getMe, refreshToken } = await import('../services/authService');
      let res;

      try {
        res = await getMe();
      } catch (error) {
        await refreshToken();
        res = await getMe();
      }

      if (res.success) {
        get().login(res.data.user);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
      set({
        isAuthenticated: false,
        user: null,
        permissions: {},
        tablesCatalog: [],
        permissionsLoaded: false,
      });
    } finally {
      set({ loading: false, sessionChecked: true });
    }
  },

  // ==========================================
  // MÉTODO NUEVO PARA BUSCAR TRADUCCIONES DE BD
  // ==========================================
  fetchLanguage: async (langCode) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const localVersion = localStorage.getItem(`i18n_version_${langCode}`);

      // Hacer UNA SOLA Petición (One-request Check) usando ETag
      const headers = {};
      if (localVersion) {
        headers['If-None-Match'] = localVersion;
      }

      console.log(`[i18n] Solicitando idioma ${langCode}...`);
      const res = await fetch(`${apiUrl}/i18n/${langCode}`, {
        headers,
      });

      // Si el servidor comprueba que la versión coincide, devuelve 304 Not Modified
      if (res.status === 304) {
        console.log(`[i18n] Cache hit (304) para ${langCode} v${localVersion}`);
        const cachedDict = localStorage.getItem(`i18n_dict_${langCode}`);
        const cachedEnums = localStorage.getItem(`i18n_enums_${langCode}`);
        
        if (cachedDict) {
          set({ 
            language: langCode, 
            dictionary: JSON.parse(cachedDict),
            enums: cachedEnums ? JSON.parse(cachedEnums) : {}
          });
          return;
        }
      }

      // Si responde 200 OK, la versión es nueva o no había caché
      if (res.ok) {
        const { version, dictionary, enums } = await res.json();
        console.log(`[i18n] Nuevo diccionario descargado para ${langCode} (v${version})`);

        localStorage.setItem(`i18n_dict_${langCode}`, JSON.stringify(dictionary));
        localStorage.setItem(`i18n_enums_${langCode}`, JSON.stringify(enums || {}));
        localStorage.setItem(`i18n_version_${langCode}`, version);

        set({ language: langCode, dictionary, enums: enums || {} });
      } else {
        console.warn(`Error comprobando idioma para ${langCode}: HTTP ${res.status}`);
      }

    } catch (error) {
      console.error("Error cargando idiomas desde backend:", error);
      if (defaultTranslations[langCode]) {
        set({ language: langCode, dictionary: defaultTranslations[langCode] });
      }
    }
  },

  // debounce timer reference
  themeTimeoutId: null,

  setTheme: async (rawTheme) => {
    // 0. Mapear ID numérico a slug si es necesario
    const theme = THEME_MAP[rawTheme] || rawTheme;
    
    // 1. Aplicación optimista en el LocalStorage y DOM
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    // 2. Clear timer anterior si el usuario spamea clicks
    const currentTimer = get().themeTimeoutId;
    if (currentTimer) clearTimeout(currentTimer);

    // 3. Setear en Zustand
    set({ theme });

    // 3.5. APLICAR VARIABLES INLINE DEL NUEVO TEMA
    const allVars = get().themeVariables;
    const currentVars = allVars[theme] || {};

    // Primero, limpiar las propiedades inline existentes para todas las variables
    Object.values(allVars).forEach(themeObj => {
      if (themeObj) {
        Object.keys(themeObj).forEach(key => {
          document.documentElement.style.removeProperty(`--${key}`);
        });
      }
    });

    // Luego aplicar las del nuevo tema seleccionado
    Object.entries(currentVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });

    // Guardar en localStorage para persistencia inmediata en recarga
    localStorage.setItem('customThemeVariables', JSON.stringify(allVars));

    // 4. Iniciar debounce de 1500ms hacia el backend (Sincroniza el tema y sus variables específicas)
    if (get().isAuthenticated) {
      const newTimer = setTimeout(async () => {
        try {
          const { updateTheme } = await import('../services/authService');
          // Leemos las variables MÁS RECIENTES en el momento del timer
          const latestVars = get().themeVariables[theme] || {};
          await updateTheme(theme, latestVars);
          console.log(`[Theme] Sincronización automática de tema "${theme}" completada`);
        } catch (error) {
          console.error('[Theme] Error en sincronización programada:', error);
        }
      }, 1500);
      set({ themeTimeoutId: newTimer });
    }
  },

  /**
   * Actualiza las variables de tema en el store y las aplica al DOM.
   * @param {Object} allVariables - Formato: { light: {...}, dark: {...}, 'high-contrast': {...} }
   */
  setThemeVariables: (allVariables) => {
    // Validar estructura básica
    const cleanVariables = {
      light: allVariables.light || {},
      dark: allVariables.dark || {},
      'high-contrast': allVariables['high-contrast'] || {}
    };

    set({ themeVariables: cleanVariables });

    const currentTheme = get().theme;
    const currentVars = cleanVariables[currentTheme] || {};

    // Limpiar variables inline previas antes de inyectar las nuevas
    // (Solo limpiamos las que conocemos para no romper otros estilos inline)
    Object.values(get().themeVariables).forEach(themeObj => {
      if (themeObj) {
        Object.keys(themeObj).forEach(key => {
          document.documentElement.style.removeProperty(`--${key}`);
        });
      }
    });

    // Aplicar al DOM dinámicamente las del tema actual
    Object.entries(currentVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  },

  /**
   * Método explícito para guardar el estado actual del tema y variables en el backend.
   * @param {string} themeName - Opcional: Tema específico a guardar (por defecto el actual)
   * @param {Object} variables - Opcional: Variables específicas a guardar (por defecto las del store)
   */
  saveTheme: async (themeName = null, variables = null) => {
    if (!get().isAuthenticated) return;
    
    // Cancelar cualquier guardado programado pendiente para evitar colisiones
    const currentTimer = get().themeTimeoutId;
    if (currentTimer) {
      clearTimeout(currentTimer);
      set({ themeTimeoutId: null });
    }

    try {
      const targetTheme = themeName || get().theme;
      const targetVars = variables || get().themeVariables[targetTheme] || {};
      
      const { updateTheme } = await import('../services/authService');
      await updateTheme(targetTheme, targetVars);
      
      console.log(`[Theme] Guardado manual completado para tema: ${targetTheme}`);
      return { success: true };
    } catch (error) {
      console.error('[Theme] Error en saveTheme manual:', error);
      throw error;
    }
  },

  fetchTheme: async () => {
    if (!get().isAuthenticated) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${apiUrl}/auth/theme`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const { tema, variables } = await res.json();
        const themeSlug = THEME_MAP[tema] || tema;
        
        set({ theme: themeSlug });
        get().setThemeVariables(variables);
        
        // Actualizar data-theme
        if (themeSlug === 'light') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', themeSlug);
      }
    } catch (error) {
      console.error('[Theme] Error cargando tema EAV:', error);
    }
  },

  setLanguage: (language) => {
    localStorage.setItem('language', language);
    // Actualizamos estado local rápido primero
    set({ language });
    // Luego disparamos el fetch 
    get().fetchLanguage(language);
  },

  login: (userData) => {
    set({ isAuthenticated: true, user: userData });

    // Cargar matriz de permisos (Fase 1)
    get().loadPermissions();

    // Absorber tema de la BD si lo tiene, sobrescribe LocalStorage
    const rawTema = userData?.tema_preferido || userData?.tema;
    if (rawTema) {
      const themeSlug = THEME_MAP[rawTema] || rawTema;
      if (['light', 'dark', 'high-contrast'].includes(themeSlug)) {
        const currentTheme = get().theme;
        if (themeSlug !== currentTheme) {
          localStorage.setItem('theme', themeSlug);
          if (themeSlug === 'light') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', themeSlug);
          }
          set({ theme: themeSlug });
        }
      }
    }
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    set({
      isAuthenticated: false,
      user: null,
      permissions: {},
      tablesCatalog: [],
      permissionsLoaded: false,
      sessionChecked: true,
    });
  },
  setUser: (userData) => {
    set({ user: userData });
    // Por si getMe() trae el tema sincronizado al recargar la página
    const rawTema = userData?.tema_preferido || userData?.tema;
    if (rawTema) {
      const themeSlug = THEME_MAP[rawTema] || rawTema;
      if (['light', 'dark', 'high-contrast'].includes(themeSlug)) {
        const currentTheme = get().theme;
        if (themeSlug !== currentTheme) {
          localStorage.setItem('theme', themeSlug);
          if (themeSlug === 'light') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', themeSlug);
          }
          set({ theme: themeSlug });
        }
      }
    }
  },
  updateUser: (newData) => {
    set((state) => ({ user: state.user ? { ...state.user, ...newData } : null }));
  },
  setAuth: (isAuthenticated) => set({ isAuthenticated }),

  /**
   * Helper para obtener la etiqueta de un enum
   * @param {string} tabla
   * @param {string} campo
   * @param {number|string} valor
   * @returns {string} Solo el texto (ej. "sysadmin")
   */
  getEnumLabel: (tabla, campo, valor) => {
    const enums = get().enums;
    const label = enums?.[tabla]?.[campo]?.[String(valor)];
    if (label) return label;
    return String(valor);
  }
}));
