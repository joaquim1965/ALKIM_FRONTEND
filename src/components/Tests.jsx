import React, { useEffect, useState } from 'react';

const Tests = () => {
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Función para obtener los datos de la tabla 'test' desde el backend
    const fetchTests = async () => {
      try {
        const response = await fetch('http://localhost:3000/tables/tests'); // Ruta al backend

        if (!response.ok) {
          throw new Error('Error al obtener los datos de test');
        }

        const data = await response.json(); // Convertir la respuesta a JSON
        setTests(data); // Guardar los datos en el estado
      } catch (err) {
        setError(err.message);
      }
    };

    fetchTests(); // Llamada a la función al montar el componente
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Lista de Tests</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Intentos Fallidos</th>
            <th>Fecha de Creación</th>
          </tr>
        </thead>
        <tbody>
          {tests.map(test => (
            <tr key={test.tid}>
              <td>{test.tid}</td>
              <td>{test.nombre}</td>
              <td>{test.email}</td>
              <td>{test.intentos_fallidos}</td>
              <td>{new Date(test.fecha_creacion).toLocaleDateString()}</td> {/* Formatear la fecha */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tests;
