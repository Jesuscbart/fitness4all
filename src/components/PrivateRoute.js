// src/components/PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useContext(AuthContext);

  if (currentUser === null) {
    // Redirige al login si el usuario no está autenticado
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
