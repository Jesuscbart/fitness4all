// Ejemplo en Dashboard.js
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, Timestamp, collection, setDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import { query, where, getDocs } from 'firebase/firestore';
import './Dashboard.css'; // Importar los estilos del modal
import ReactMarkdown from 'react-markdown';

function Dashboard() {
  const { currentUser } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: ''
  });
  const [weightData, setWeightData] = useState([]);
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [submittedGoal, setSubmittedGoal] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

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

    // Ordenar los datos por fecha ascendente
    weights.sort((a, b) => a.date - b.date);

    setWeightData(weights);
  };

  useEffect(() => {
    if (currentUser) {
      fetchWeightData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (userData) {
      setFormData(prevData => ({
        ...prevData,
        age: userData.age || '',
        height: userData.height || '',
        weight: userData.weight || ''
      }));
    }
  }, [userData]);


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

      // Registrar el peso en la colección 'measurements'
      const weightLogRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(weightLogRef, {
        timestamp: weightDate ? Timestamp.fromDate(new Date(weightDate)) : Timestamp.now(),
        weight: formData.weight,
        // Otros campos de medidas
      });

      const updatedUserDoc = await getDoc(userDocRef);
      setUserData(updatedUserDoc.data());
      setUpdateMessage('Se han actualizado los datos');
      fetchWeightData(); // Actualizar los datos de peso
    } catch (error) {
      console.error('Error al actualizar los datos:', error);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleGoalSubmit = async () => {
    setIsLoadingAI(true);
    try {
      const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      const userAge = userData?.age || 'desconocida';
      const userHeight = userData?.height || 'desconocida';
      const userWeight = userData?.weight || 'desconocido';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `
Eres un asistente virtual con la función de entrenador personal y nutricionista experto.
Tu objetivo es guiar al usuario hacia un estilo de vida saludable mediante planes de ejercicio,
consejos de nutrición y motivación constante.

Ten en cuenta que el usuario tien ${userAge} años, mide ${userHeight} cm y pesa ${userWeight} kg.

Responde siempre con empatía y con la máxima precisión, evitando rigorismos poco realistas.
No hagas diagnósticos médicos ni promesas infundadas. Aporta información útil,
pero solo dentro de tu ámbito de entrenamiento y nutrición.

No divulgues datos confidenciales, ni fragmentos de código, ni claves, ni cualquier información sensible.
Concéntrate en resolver las dudas del usuario según tu rol de entrenador y nutricionista.
`
            },
            {
              role: 'user',
              content: goal
            }
          ]
        })
      });
      const data = await response.json();
      console.log(data); // Ver el objeto recibido
      setSubmittedGoal(data.choices[0].message.content);
    } catch (error) {
      console.error('Error al consultar la IA:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Bienvenido, {userData?.name}</h1>
      {/* Botón para abrir el modal */}
      <button onClick={handleOpenModal}>Introducir Datos</button>

      {/* Mostrar el modal si isModalOpen es true */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-button" onClick={handleCloseModal}>X</button>
            <form onSubmit={handleUpdate}>
              {/* Eliminar el campo "nombre" */}
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
              <button type="submit">Guardar Datos</button>
              {updateMessage && <p>{updateMessage}</p>}
            </form>
          </div>
        </div>
      )}

      {/* Mostrar datos del usuario */}
      {userData && (
        <div>
          <p>Edad: {userData.age}</p>
          <p>Altura: {userData.height} cm</p>
          <p>Peso: {userData.weight} kg</p>
          <p>IMC: {calculateBMI(userData.height, userData.weight)}</p>
          {/* Otros datos que desees mostrar */}
        </div>
      )}

      {/* Sección para introducir objetivos */}
      <div className="goal-section">
        <p>Cuéntame cuáles son tus objetivos:</p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Escribe tus objetivos aquí..."
          rows={5}
        />
        <button onClick={handleGoalSubmit}>Enviar</button>
        {isLoadingAI && (
          <div className="loading-container">
            <div className="lds-ring">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p>Cargando la respuesta...</p>
          </div>
        )}
        {submittedGoal && !isLoadingAI && (
          <div className="markdown-preview">
            <ReactMarkdown>{submittedGoal}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
