// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  const isAuthenticated = true; // Cambia esto a la lógica real de autenticación

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
