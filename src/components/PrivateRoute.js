import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, isProfileComplete } = useContext(AuthContext);
  const location = useLocation();

  // Si no está autenticado, redirigir al login
  if (currentUser === null) {
    return <Navigate to="/login" />;
  }

  // Si está autenticado pero el perfil no está completo
  if (currentUser && !isProfileComplete) {
    // Solo permitir acceso a la página de completar perfil
    if (location.pathname !== '/complete-profile') {
      return <Navigate to="/complete-profile" />;
    }
  }

  // Si está autenticado y el perfil está completo
  if (currentUser && isProfileComplete) {
    // Si intenta acceder a complete-profile, redirigir al dashboard
    if (location.pathname === '/complete-profile') {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default PrivateRoute;
