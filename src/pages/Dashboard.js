// Ejemplo en Dashboard.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function Dashboard() {
  const { currentUser } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: ''
  });

  const calculateBMI = (height, weight) => {
    if (height && weight) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return null;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        console.log('No se encontró el usuario en Firestore');
      }
      setLoading(false);
    };

    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updatedData = {};

    // Solo actualizar los campos que no están vacíos
    for (const key in formData) {
      if (formData[key]) {
        updatedData[key] = formData[key];
      }
    }

    try {
      await updateDoc(userDocRef, updatedData);
      const updatedUserDoc = await getDoc(userDocRef);
      setUserData(updatedUserDoc.data());
      alert('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Bienvenido, {userData?.name}</h1>
      {userData && (
        <div>
          <p>Nombre: {userData.name}</p>
          <p>Edad: {userData.age}</p>
          <p>Altura: {userData.height} cm</p>
          <p>Peso: {userData.weight} kg</p>
          <p>IMC: {calculateBMI(userData.height, userData.weight)}</p>
          {/* Agrega aquí otros datos del usuario que desees mostrar */}
        </div>
      )}
      <form onSubmit={handleUpdate}>
        <div>
          <label htmlFor="name">Nombre:</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="age">Edad:</label>
          <input type="number" id="age" name="age" value={formData.age} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="height">Altura (cm):</label>
          <input type="number" id="height" name="height" value={formData.height} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="weight">Peso (kg):</label>
          <input type="number" id="weight" name="weight" value={formData.weight} onChange={handleChange} />
        </div>
        <button type="submit">Actualizar Datos</button>
      </form>
      {/* Resto del contenido del Dashboard */}
    </div>
  );
}

export default Dashboard;
