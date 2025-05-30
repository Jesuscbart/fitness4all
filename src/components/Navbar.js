// src/components/Navbar.js
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { AuthContext } from '../contexts/AuthContext';
import './Navbar.css';

function Navbar() {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log('El usuario ha cerrado sesión');
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  };

  // Función para determinar si un enlace está activo
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <nav>
      <ul>
        <li>
          <Link 
            to="/" 
            className={isActiveLink('/') ? 'active' : ''}
          >
            Inicio
          </Link>
        </li>
        {/* Muestra el botón de cierre de sesión solo si el usuario está autenticado */}
        {currentUser && (
          <>
            <li>
              <Link 
                to="/exercise-log" 
                className={isActiveLink('/exercise-log') ? 'active' : ''}
              >
                Ejercicios
              </Link>
            </li>
            <li>
              <Link 
                to="/food-log" 
                className={isActiveLink('/food-log') ? 'active' : ''}
              >
                Dietas
              </Link>
            </li>
            <li>
              <Link 
                to="/meal-planner" 
                className={isActiveLink('/meal-planner') ? 'active' : ''}
              >
                Planificador de Comidas
              </Link>
            </li>
            <li>
              <Link 
                to="/history" 
                className={isActiveLink('/history') ? 'active' : ''}
              >
                Historial
              </Link>
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
