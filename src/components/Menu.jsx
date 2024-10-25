import React from 'react';
import { Link } from 'react-router-dom';

const Menu = () => {
  return (
    <nav>
      <ul>
        <li><Link to="/login">Login</Link></li>
        <li><Link to="/register">Register</Link></li>
        <li><Link to="/protected">Protected</Link></li>
        <li><Link to="/tests">Ver Tests</Link></li> {/* Enlace a Tests */}
      </ul>
    </nav>
  );
};

export default Menu;
