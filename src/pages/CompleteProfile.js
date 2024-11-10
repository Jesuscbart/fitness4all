import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';

function CompleteProfile() {
  const { currentUser } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);
  // Otros campos según tus necesidades
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        age,
        height,
        weight,
        // Otros campos
      });
      console.log('Perfil actualizado');
      navigate('/'); // Redirige al Dashboard u otra página
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Completa tu perfil</h2>
      <input
        type="number"
        placeholder="Edad"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Altura (cm)"
        value={height}
        onChange={(e) => setHeight(e.target.value)}
        required
      />
      <input
        type="number"
        placeholder="Peso (kg)"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        required
      />
      {/* Otros campos */}
      <button type="submit">Guardar</button>
    </form>
  );
}

export default CompleteProfile;