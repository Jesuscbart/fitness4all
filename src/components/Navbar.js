// src/components/Navbar.js
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../contexts/AuthContext';

function Navbar() {
  const { currentUser } = useContext(AuthContext);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log('El usuario ha cerrado sesión');
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  };

  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Inicio</Link>
        </li>
        {/* Muestra el botón de cierre de sesión solo si el usuario está autenticado */}
        {currentUser && (
          <>
            <li>
              <Link to="/exercise-log">Ejercicios</Link>
            </li>
            <li>
              <Link to="/food-log">Dietas</Link>
            </li>
            <li>
              <Link to="/meal-planner">Planificador de Comidas</Link>
            </li>
            <li>
              <Link to="/history">Historial</Link>
            </li>
            <li>
              <button onClick={handleSignOut}>Cerrar Sesión</button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
