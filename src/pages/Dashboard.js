// Ejemplo en Dashboard.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp, collection, setDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { query, where, getDocs } from 'firebase/firestore';

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
  const [weightData, setWeightData] = useState([]);
  const [weightDate, setWeightDate] = useState('');

  const calculateBMI = (height, weight) => {
    if (height && weight) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return null;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        console.error('Usuario no autenticado');
        return;
      }
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

  const fetchWeightData = async () => {
    if (!currentUser) {
      console.error('Usuario no autenticado');
      return;
    }
    const weightQuery = query(collection(db, 'users', currentUser.uid, 'measurements'));
    const querySnapshot = await getDocs(weightQuery);
    const weights = querySnapshot.docs.map(doc => ({
      date: doc.data().timestamp.toDate(),
      weight: doc.data().weight
    }));
    setWeightData(weights);
  };

  useEffect(() => {
    if (currentUser) {
      fetchWeightData();
    }
  }, [currentUser]);

  useEffect(() => {
    const updateHeightAndWeight = async () => {
      if (!currentUser) {
        console.error('Usuario no autenticado');
        return;
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, {
          height: formData.height,
          weight: formData.weight
        });
        console.log('Altura y peso actualizados automáticamente');
      } catch (error) {
        console.error('Error al actualizar altura y peso:', error);
      }
    };

    if (formData.height || formData.weight) {
      updateHeightAndWeight();
    }
  }, [formData.height, formData.weight, currentUser]);

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

  const handleWeightLog = async (e) => {
    e.preventDefault();
    if (!weightDate || !formData.weight) {
      alert('Por favor, selecciona una fecha y un peso.');
      return;
    }
    try {
      const weightLogRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(weightLogRef, {
        timestamp: Timestamp.fromDate(new Date(weightDate)),
        weight: formData.weight,
        height: formData.height,
        // Otros campos de medidas
      });
      alert('Peso registrado correctamente');
      fetchWeightData(); // Actualiza los datos de peso
    } catch (error) {
      console.error('Error al registrar el peso:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  const weightChartData = {
    labels: weightData.map(entry => entry.date.toLocaleDateString()),
    datasets: [
      {
        label: 'Peso',
        data: weightData.map(entry => entry.weight),
        fill: false,
        backgroundColor: 'blue',
        borderColor: 'blue'
      }
    ]
  };

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
        <div>
          <label htmlFor="weightDate">Fecha del Peso:</label>
          <input type="date" id="weightDate" name="weightDate" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} required />
        </div>
        <button type="submit">Actualizar Datos</button>
      </form>
      <form onSubmit={handleWeightLog}>
        <button type="submit">Registrar Peso</button>
      </form>
      {weightData.length > 0 && (
        <div>
          <h2>Progresión del Peso</h2>
          <Line data={weightChartData} />
        </div>
      )}
      {/* Resto del contenido del Dashboard */}
    </div>
  );
}

export default Dashboard;
