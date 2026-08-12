import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Aplicar colores personalizados desde localStorage si existen
// La aplicación de temas ahora se centraliza en useStore a través de App.jsx
// para evitar conflictos con variables obsoletas en localStorage.

// También aplicar cuando cambie el tema
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
