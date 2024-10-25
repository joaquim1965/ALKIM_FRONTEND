// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const navigate = useNavigate(); // Reemplaza useHistory por useNavigate

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulación de autenticación
    if (form.username === 'admin' && form.password === 'admin') {
      navigate('/protected'); // Redirige a la página protegida
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username: </label>
          <input type="text" name="username" value={form.username} onChange={handleChange} />
        </div>
        <div>
          <label>Password: </label>
          <input type="password" name="password" value={form.password} onChange={handleChange} />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
