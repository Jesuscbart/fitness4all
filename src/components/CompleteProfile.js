// src/pages/CompleteProfile.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function CompleteProfile() {
  const { currentUser } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [errors, setErrors] = useState({});
  // Otros campos según tus necesidades
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    const newErrors = {};
    if (age < 10 || age > 120) {
      newErrors.age = 'La edad debe estar entre 10 y 120 años.';
    }
    if (height < 60 || height > 240) {
      newErrors.height = 'La altura debe estar entre 60 cm y 240 cm.';
    }
    if (weight < 20 || weight > 650) {
      newErrors.weight = 'El peso debe estar entre 20 kg y 650 kg.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

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

  return (
    <form onSubmit={handleSubmit} noValidate> {/* Agregado: noValidate */}
      <h2>Completa tu perfil</h2>
      <div>
        <input
          type="number"
          placeholder="Edad"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min="10"
          max="120"
        />
        {errors.age && <p className="error">{errors.age}</p>} {/* Agregado: Mensaje de error */}
      </div>
      <div>
        <input
          type="number"
          placeholder="Altura (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          min="60"
          max="240"
        />
        {errors.height && <p className="error">{errors.height}</p>} {/* Agregado: Mensaje de error */}
      </div>
      <div>
        <input
          type="number"
          placeholder="Peso (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min="20"
          max="650"
        />
        {errors.weight && <p className="error">{errors.weight}</p>} {/* Agregado: Mensaje de error */}
      </div>
      {/* Otros campos */}
      <button type="submit">Guardar</button>
    </form>
  );
}

export default CompleteProfile;
