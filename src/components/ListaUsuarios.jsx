import React, { useEffect, useState } from 'react';
import { getUsers } from '../services/userService';

const UserList = () => {
  const [users, setUsers] = useState([]);

  // Utilizamos useEffect para obtener los usuarios al cargar el componente
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers(); // Llamamos a la función para obtener los usuarios
        setUsers(data); // Establecemos los usuarios obtenidos en el estado
      } catch (error) {
        console.error('Error al obtener los usuarios:', error);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>Lista de Usuarios</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.nombre}</li> // Mostramos el nombre de cada usuario
        ))}
      </ul>
    </div>
  );
};

export default UserList;
