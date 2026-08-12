// vite.config.js

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

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
    plugins: [react()],
    server: {
      https: httpsConfig,
      port,
      host,
      strictPort: true, // Fija el puerto para evitar cambios automáticos
      proxy: {
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
        '^/files(/|\\?|$)':  { target: 'https://localhost:3000', secure: false, changeOrigin: true }
      }
    },
    build: {
      outDir: mode === 'production' ? 'dist' : 'dev-dist', // Diferente carpeta de salida según el entorno
    },
    optimizeDeps: {
      exclude: ['lucide-react'], // Exclusión de dependencias específicas
    },
  };
});
