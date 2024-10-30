// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ThemeProvider from './context/ThemeProvider';
import LanguageProvider from './context/LanguageProvider';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Tests from './pages/Tests';
import Usuarios from './pages/Usuarios';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/tests" element={<Tests />} />
    
            {/* Ruta protegida para la página de Usuarios */}
	      <Route path="/usuarios" element={<PrivateRoute component={Usuarios} />} /> {/* Ruta protegida */}
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
