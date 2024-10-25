// src/services/usuarios.js
export const loginUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    return await response.json();
  } catch (error) {
    return { success: false, message: 'Error connecting to the server' };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    return await response.json();
  } catch (error) {
    return { success: false, message: 'Error connecting to the server' };
  }
};
