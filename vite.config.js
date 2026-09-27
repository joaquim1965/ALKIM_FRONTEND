// vite.config.js

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// El icono de ALKIM (A blanca sobre rojo) es solo para producción. En desarrollo
// (`npm run dev`) se deja el de Vite, para distinguir de un vistazo la pestaña
// local de la de app.alkim.es (27/09/2026).
const iconoSoloEnProduccion = {
  name: 'icono-solo-en-produccion',
  apply: 'serve',
  transformIndexHtml: (html) => html
    .replace('href="/favicon.svg"', 'href="/vite.svg"')
    .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, ''),
};

export default defineConfig(({ mode }) => {
  // Carga las variables de entorno
  const env = loadEnv(mode, process.cwd());

  const isHttps = env.VITE_HTTPS === 'true';
  const host = env.VITE_HOST;
  const port = env.VITE_PORT;

  // Configuración HTTPS
  const httpsConfig = isHttps
    ? {
        key: fs.readFileSync('./certificates/localhost.key'), // Ruta al archivo .key
        cert: fs.readFileSync('./certificates/localhost.crt'), // Ruta al archivo .crt
      }
    : false;

  // Devuelve la configuración final basada en el entorno
  return {
    plugins: [react(), iconoSoloEnProduccion],
    server: {
      https: httpsConfig,
      port,
      host,
      strictPort: true, // Fija el puerto para evitar cambios automáticos
      // ⚠ Cada familia de rutas del backend necesita SU línea aquí.
      //
      // Lo que no esté en esta lista no llega al backend: se lo queda el
      // servidor de desarrollo y devuelve el index.html de la aplicación. Como
      // eso no es JSON, la pantalla que llamaba se queda sin datos y sin poder
      // decir por qué — que es lo que pasó con `/situacion`, y costó tres
      // diagnósticos equivocados (26/08/2026).
      proxy: {
        '^/situacion(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/auth(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/i18n(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/api(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/sql(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/users(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/tables(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/theme(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/bancos(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/gestion-bancos(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/permissions(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/crawler(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/health(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/companies(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        '^/files(/|\\?|$)':  { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        // API de Fiscalidad. No «/fiscalidad»: esa es la ruta de la pantalla.
        '^/fiscal(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true },
        // Tareas programadas (27/09/2026). La pantalla es «/sistema/tareas».
        '^/tareas(/|\\?|$)': { target: 'https://localhost:3000', secure: false, changeOrigin: true }
      }
    },
    build: {
      outDir: mode === 'production' ? 'dist' : 'dev-dist', // Diferente carpeta de salida según el entorno
      // noVNC (pantalla remota para grabar guiones) usa `await` de primer nivel,
      // que necesita es2022. Lo soportan todos los navegadores actuales (27/09/2026).
      target: 'es2022',
    },
    optimizeDeps: {
      exclude: ['lucide-react'], // Exclusión de dependencias específicas
      esbuildOptions: { target: 'es2022' },
    },
  };
});
