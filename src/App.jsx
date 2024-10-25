import React from 'react';

import {BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import PrivateRoute from './components/PrivateRoute';
import ProtectedPage from './components/ProtectedPage';
import Tests from './components/Tests';
import Menu from './components/Menu'; // Importar el nuevo componente del menú

function App() {
  return (
    <Router>
      <div>
        <Menu /> {/* Incluir el menú */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/protected" element={<PrivateRoute><ProtectedPage /></PrivateRoute>} />
          <Route path="/tests" element={<Tests />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
