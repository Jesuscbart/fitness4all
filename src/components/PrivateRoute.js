// src/components/PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useContext(AuthContext);

  if (currentUser === null) {
    // Puedes mostrar un spinner o mensaje de carga si lo deseas
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
