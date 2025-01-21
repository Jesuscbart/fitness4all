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

  // Añadir estados para userAge, userHeight y userWeight
  const [userAge, setUserAge] = useState('');
  const [userHeight, setUserHeight] = useState('');
  const [userWeight, setUserWeight] = useState('');

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
          
          // Asignar valores a userAge, userHeight y userWeight
          setUserAge(data.age);
          setUserHeight(data.height);
          setUserWeight(data.weight);
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
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `
Eres un entrenador personal altamente calificado con experiencia en la creación de programas de ejercicio personalizados. Tu objetivo es ayudar al usuario a alcanzar sus metas de fitness proporcionando un plan de ejercicios semanal detallado y efectivo.

**Información del Usuario:**
- **Edad:** ${userAge} años
- **Altura:** ${userHeight} cm
- **Peso:** ${userWeight} kg
- **Objetivo:** ${goal}

**Instrucciones:**
- Elabora un programa de ejercicios semanal en formato Markdown.
- Divide el plan en días de la semana (Lunes a Domingo).
- Para cada día, incluye:
  - **Tipo de ejercicio** (por ejemplo, cardio, fuerza, flexibilidad).
  - **Descripción detallada** de cada ejercicio.
  - **Número de series y repeticiones** o duración.
  - **Consejos** para una ejecución correcta.
- Incluye un **calentamiento** y **estiramiento** diario.
- Asegúrate de que el programa sea equilibrado, variado y adecuado para el nivel de experiencia del usuario.
- Utiliza listas, encabezados y formatos claros para facilitar la lectura.

**Ejemplo de Formato:**
## Lunes: Entrenamiento de Fuerza

### Calentamiento
- 5 minutos de saltos de tijera
- 5 minutos de estiramientos dinámicos

### Ejercicio 1: Sentadillas
- **Series:** 3
- **Repeticiones:** 12
- **Descripción:** Mantén la espalda recta y baja hasta que tus muslos estén paralelos al suelo.
- **Consejo:** No dejes que tus rodillas sobrepasen los dedos de los pies.

### Ejercicio 2: Flexiones
- **Series:** 3
- **Repeticiones:** 10
- **Descripción:** Mantén el cuerpo recto y baja hasta que el pecho casi toque el suelo.
- **Consejo:** No arquees la espalda durante el ejercicio.

### Estiramiento
- 5 minutos de estiramientos estáticos enfocándose en piernas y brazos.
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
    <div className="exercise-log"> {/* Añadido para aplicar los estilos */}
      <h1>Registro de Ejercicios</h1>
      {isLoading && (
        <div className="loading-container">
          <div className="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p>Creando tu plan de ejercicios personalizado...</p>
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