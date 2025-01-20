import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';

function CompleteProfile() {
  const { currentUser } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [updateMessage, setUpdateMessage] = useState(''); // Agregado
  // Otros campos según tus necesidades
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  // Añadir una función manejadora para onBlur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    if (name === 'age') {
      if (value < 10 || value > 120) {
        newErrors.age = 'La edad debe estar entre 10 y 120 años.';
      } else {
        delete newErrors.age;
      }
    }

    if (name === 'height') {
      if (value < 60 || value > 240) {
        newErrors.height = 'La altura debe estar entre 60 cm y 240 cm.';
      } else {
        delete newErrors.height;
      }
    }

    if (name === 'weight') {
      if (value < 20 || value > 650) {
        newErrors.weight = 'El peso debe estar entre 20 kg y 650 kg.';
      } else {
        delete newErrors.weight;
      }
    }

    setErrors(newErrors);
  };

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

      const measurementDocRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(measurementDocRef, {
        timestamp: Timestamp.now(),
        weight,
        height,
        // Otros campos de medidas
      });

      console.log('Perfil actualizado');
      setUpdateMessage('Perfil actualizado con éxito'); // Agregado
      navigate('/'); // Redirige al Dashboard u otra página
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="complete-profile-form"> {/* Agregado: className */}
      <h2>Completa tu perfil</h2>
      <div>
        <label htmlFor="age">Edad:</label> {/* Agregado: Etiqueta para Edad */}
        <input
          type="number"
          name="age"
          placeholder="Edad"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          onBlur={handleBlur} // Agregado
          min="10"      // Agregado: Atributo min
          max="120"     // Agregado: Atributo max
          /* Removed: required */
        />
        {errors.age && <p className="error">{errors.age}</p>} {/* Agregado: Mensaje de error */}
      </div>
      <div>
        <label htmlFor="height">Altura (cm):</label> {/* Agregado: Etiqueta para Altura */}
        <input
          type="number"
          name="height"
          placeholder="Altura (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onBlur={handleBlur} // Agregado
          min="60"      // Agregado: Atributo min
          max="240"     // Agregado: Atributo max
          /* Removed: required */
        />
        {errors.height && <p className="error">{errors.height}</p>} {/* Agregado: Mensaje de error */}
      </div>
      <div>
        <label htmlFor="weight">Peso (kg):</label> {/* Agregado: Etiqueta para Peso */}
        <input
          type="number"
          name="weight"
          placeholder="Peso (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleBlur} // Agregado
          min="20"      // Agregado: Atributo min
          max="650"     // Agregado: Atributo max
          /* Removed: required */
        />
        {errors.weight && <p className="error">{errors.weight}</p>} {/* Agregado: Mensaje de error */}
      </div>
      <button type="submit">Guardar</button>
      {updateMessage && <p className="success">{updateMessage}</p>} {/* Modificado: Clase 'success' */}
    </form>
  );
}

export default CompleteProfile;