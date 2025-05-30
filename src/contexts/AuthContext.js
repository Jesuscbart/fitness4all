import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
  
    // Función para verificar si el perfil está completo
    const checkProfileComplete = (userData) => {
      if (!userData) return false;
      
      // Verificar que tenga los campos obligatorios: age, height, weight, sex
      return !!(userData.age && userData.height && userData.weight && userData.sex);
    };

    // Función para obtener datos del usuario desde Firestore
    const fetchUserData = async (user) => {
      if (!user) {
        setUserData(null);
        setIsProfileComplete(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setIsProfileComplete(checkProfileComplete(data));
        } else {
          // Usuario existe en Auth pero no en Firestore - perfil incompleto
          setUserData(null);
          setIsProfileComplete(false);
        }
      } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        setUserData(null);
        setIsProfileComplete(false);
      }
    };
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          await fetchUserData(user);
        } else {
          setUserData(null);
          setIsProfileComplete(false);
        }
        
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, []);

    // Función para actualizar el estado del perfil (para después de completar el perfil)
    const refreshUserData = async () => {
      if (currentUser) {
        await fetchUserData(currentUser);
      }
    };
  
    if (loading) {
      return <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#5a6c7d'
      }}>Cargando...</div>;
    }
  
    return (
      <AuthContext.Provider value={{ 
        currentUser, 
        userData, 
        isProfileComplete, 
        refreshUserData 
      }}>
        {children}
      </AuthContext.Provider>
    );
};

export const useAuth = () => {
  return useContext(AuthContext);
};