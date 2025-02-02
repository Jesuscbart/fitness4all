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
  const [errors, setErrors] = useState({}); // Almacena los errores de validación
  const [weightData, setWeightData] = useState([]);
  const [weightDate, setWeightDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [submittedGoal, setSubmittedGoal] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Calcula el IMC a partir de la altura y el peso
  const calculateBMI = (height, weight) => {
    if (height && weight) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return null;
  };

  // Obtiene los datos del usuario desde Firestore
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
        console.log('Usuario no encontrado en Firestore');
      }
      setLoading(false);
    };

    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  // Obtiene el historial de peso del usuario
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

    // Ordena los datos por fecha en orden ascendente
    weights.sort((a, b) => a.date - b.date);
    setWeightData(weights);
  };

  useEffect(() => {
    if (currentUser) {
      fetchWeightData();
    }
  }, [currentUser]);

  // Inicializa el formulario con los datos del usuario
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

  // Valida los valores cuando se pierde el foco en un campo
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

  // Actualiza los datos del usuario y registra la medida en Firestore
  const handleUpdate = async (e) => {
    e.preventDefault();

    // Validación de datos introducidos
    const newErrors = {};
    if (formData.age < 10 || formData.age > 120) {
      newErrors.age = 'La edad debe estar entre 10 y 120 años.';
    }
    if (formData.height < 60 || formData.height > 240) {
      newErrors.height = 'La altura debe estar entre 60 cm y 240 cm.';
    }
    if (formData.weight < 20 || formData.weight > 650) {
      newErrors.weight = 'El peso debe estar entre 20 kg y 650 kg.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const userDocRef = doc(db, 'users', currentUser.uid);
    const updatedData = {};

    // Actualiza solo los campos que tengan valor
    for (const key in formData) {
      if (formData[key]) {
        updatedData[key] = formData[key];
      }
    }

    try {
      await updateDoc(userDocRef, updatedData);

      // Registra la medida en la colección "measurements"
      const measurementLogRef = doc(collection(db, 'users', currentUser.uid, 'measurements'));
      await setDoc(measurementLogRef, {
        timestamp: weightDate ? Timestamp.fromDate(new Date(weightDate)) : Timestamp.now(),
        weight: formData.weight,
        height: formData.height
      });

      const updatedUserDoc = await getDoc(userDocRef);
      setUserData(updatedUserDoc.data());
      setUpdateMessage('Se han actualizado los datos correctamente');
      setTimeout(() => setUpdateMessage(''), 3000);
      fetchWeightData(); // Actualiza el historial de peso
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

  // Envía la consulta a la IA para generar un plan basado en el objetivo del usuario
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

Ten en cuenta que el usuario tiene ${userAge} años, mide ${userHeight} cm y pesa ${userWeight} kg.

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
      const aiResponse = data.choices[0].message.content;
      setSubmittedGoal(aiResponse);

      // Guardar submittedGoal en Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        submittedGoal: aiResponse
      });
    } catch (error) {
      console.error('Error al consultar la IA:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Obtiene la respuesta previamente registrada de la IA
  useEffect(() => {
    const fetchSubmittedGoal = async () => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setSubmittedGoal(userDoc.data().submittedGoal || '');
        }
      }
    };

    fetchSubmittedGoal();
  }, [currentUser]);


  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Bienvenido, {userData?.name}</h1>
      <button onClick={handleOpenModal}>Introducir Datos</button>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button className="close-button" onClick={handleCloseModal}>X</button>
            <form onSubmit={handleUpdate} noValidate>
              <div>
                <label htmlFor="age">Edad:</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="10"
                  max="120"
                />
                {errors.age && <p className="error">{errors.age}</p>}
              </div>
              <div>
                <label htmlFor="height">Altura (cm):</label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="60"
                  max="240"
                />
                {errors.height && <p className="error">{errors.height}</p>}
              </div>
              <div>
                <label htmlFor="weight">Peso (kg):</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  min="20"
                  max="650"
                />
                {errors.weight && <p className="error">{errors.weight}</p>}
              </div>
              <div>
                <label htmlFor="weightDate">Fecha del Peso:</label>
                <input type="date" id="weightDate" name="weightDate" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} />
              </div>
              <button type="submit">Guardar Datos</button>
              {updateMessage && <p className="success">{updateMessage}</p>}
            </form>
          </div>
        </div>
      )}

      {userData && (
        <div>
          <p><strong>Edad: </strong>{userData.age}</p>
          <p><strong>Altura: </strong>{userData.height} cm</p>
          <p><strong>Peso: </strong>{userData.weight} kg</p>
          <p><strong>IMC: </strong>{calculateBMI(userData.height, userData.weight)}</p>
        </div>
      )}

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