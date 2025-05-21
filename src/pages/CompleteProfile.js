import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import './CompleteProfile.css';

function CompleteProfile() {
  const { currentUser } = useContext(AuthContext);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [sex, setSex] = useState('hombre');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [updateMessage, setUpdateMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setLoading(false);
    }
  }, [currentUser]);

  // Maneja la validación al perder el foco en un campo
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

  // Envía el formulario y actualiza los datos del usuario en Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de campos
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
        sex
      });

      const measurementDocRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(measurementDocRef, {
        timestamp: Timestamp.now(),
        weight,
        height
      });

      console.log('Perfil actualizado');
      setUpdateMessage('Perfil actualizado con éxito');
      navigate('/');
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
    }
  };

  if (loading) {
    return <div className="loading-container">Cargando...</div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="complete-profile-form">
      <h2>Completa tu perfil</h2>
      
      <div className="form-field">
        <label htmlFor="age">Edad:</label>
        <input
          type="number"
          id="age"
          name="age"
          placeholder="Introduce tu edad"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          onBlur={handleBlur}
          min="10"
          max="120"
        />
        {errors.age && <p className="error">{errors.age}</p>}
      </div>
      
      <div className="form-field">
        <label>Sexo:</label>
        <div className="radio-container">
          <div className="radio-option">
            <input
              type="radio"
              id="sexo-hombre"
              name="sex"
              value="hombre"
              checked={sex === 'hombre'}
              onChange={(e) => setSex(e.target.value)}
            />
            <label htmlFor="sexo-hombre" className="radio-label">
              <span className="gender-icon">♂</span>
              Hombre
            </label>
          </div>
          
          <div className="radio-option">
            <input
              type="radio"
              id="sexo-mujer"
              name="sex"
              value="mujer"
              checked={sex === 'mujer'}
              onChange={(e) => setSex(e.target.value)}
            />
            <label htmlFor="sexo-mujer" className="radio-label">
              <span className="gender-icon">♀</span>
              Mujer
            </label>
          </div>
        </div>
      </div>
      
      <div className="form-field">
        <label htmlFor="height">Altura (cm):</label>
        <input
          type="number"
          id="height"
          name="height"
          placeholder="Introduce tu altura en cm"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onBlur={handleBlur}
          min="60"
          max="240"
        />
        {errors.height && <p className="error">{errors.height}</p>}
      </div>
      
      <div className="form-field">
        <label htmlFor="weight">Peso (kg):</label>
        <input
          type="number"
          id="weight"
          name="weight"
          placeholder="Introduce tu peso en kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={handleBlur}
          min="20"
          max="650"
        />
        {errors.weight && <p className="error">{errors.weight}</p>}
      </div>
      
      <button type="submit">Guardar</button>
      {updateMessage && <p className="success">{updateMessage}</p>}
    </form>
  );
}

export default CompleteProfile;