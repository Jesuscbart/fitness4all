import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import './ExerciseLog.css'; // Añadido para aplicar los estilos

function ExerciseLog() {
  const { currentUser } = useContext(AuthContext);
  const [exercisePlan, setExercisePlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submittedGoal, setSubmittedGoal] = useState(''); // Asegurado
  const [lastProcessedGoal, setLastProcessedGoal] = useState(''); // Añadido

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          // Cargar plan guardado para conservarlo al recargar
          const data = userDoc.data();
          if (data.exercisePlan) setExercisePlan(data.exercisePlan);
          if (data.submittedGoal) {
            setSubmittedGoal(data.submittedGoal); // Establecer el estado correctamente
          }
          if (data.lastProcessedGoal) {
            setLastProcessedGoal(data.lastProcessedGoal); // Establecer el último objetivo procesado
          }
        }
      } catch (error) {
        console.error('Error al obtener los datos:', error);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    if (submittedGoal && submittedGoal !== lastProcessedGoal) {
      handleGeneratePlan(submittedGoal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedGoal]);

  const handleGeneratePlan = async (goal) => { // Recibe el objetivo como parámetro
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      // Llamada a la IA para generar plan en base a submittedGoal
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `
Eres un entrenador personal. Basándote en el siguiente objetivo:
"${goal}"
Elabora un programa de ejercicios semanal en Markdown que permita al usuario cumplir con esos objetivos. Explica cada ejercicio brevemente.
`
            }
          ]
        })
      });
      const data = await response.json();
      const newPlan = data.choices[0].message.content;

      await updateDoc(userDocRef, { 
        exercisePlan: newPlan,
        lastProcessedGoal: goal // Actualizar el último objetivo procesado
      });
      setExercisePlan(newPlan);
      setLastProcessedGoal(goal); // Actualizar el estado local
    } catch (error) {
      console.error('Error al generar el plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Registro de Ejercicios</h1>
      {isLoading && (
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
      {exercisePlan && (
        <div className="exercise-plan">
          <ReactMarkdown>{exercisePlan}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default ExerciseLog;

