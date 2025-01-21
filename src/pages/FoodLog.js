import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import './FoodLog.css';

function FoodLog() {
  const { currentUser } = useContext(AuthContext);
  const [mealPlan, setMealPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submittedGoal, setSubmittedGoal] = useState('');
  const [lastProcessedGoal, setLastProcessedGoal] = useState('');
  
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
          const data = userDoc.data();
          if (data.mealPlan) setMealPlan(data.mealPlan);
          if (data.submittedGoal) setSubmittedGoal(data.submittedGoal);
          if (data.lastProcessedMealGoal) setLastProcessedGoal(data.lastProcessedMealGoal);
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
      handleGenerateMealPlan(submittedGoal);
    }
  }, [submittedGoal, lastProcessedGoal]);

  const handleGenerateMealPlan = async (goal) => {
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
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
Eres un nutricionista certificado con amplia experiencia en la creación de planes de alimentación personalizados. Tu objetivo es ayudar al usuario a alcanzar sus metas de salud y bienestar proporcionando un plan de alimentación semanal detallado y equilibrado.

**Información del Usuario:**
- **Edad:** ${userAge} años
- **Altura:** ${userHeight} cm
- **Peso:** ${userWeight} kg
- **Objetivo:** ${goal}

**Instrucciones:**
- Elabora un plan de alimentación semanal en formato Markdown.
- Divide el plan en días de la semana (Lunes a Domingo).
- Para cada día, incluye:
  - **Desayuno, Almuerzo, Cena y Snacks.**
  - **Porciones aproximadas** de cada comida.
  - **Horarios sugeridos** para cada comida.
  - **Consejos de preparación** básicos.
  - **Alternativas saludables** para algunos ingredientes.
- Asegúrate de que el plan sea balanceado, variado y adecuado para las necesidades del usuario.
- Incluye recomendaciones sobre la hidratación y posibles suplementos si es pertinente.
- Utiliza listas, tablas y formatos claros para facilitar la lectura.

**Ejemplo de Formato:**

## Lunes

### Desayuno
- **Avena con frutas**
  - 1 taza de avena
  - 1 plátano en rodajas
  - 1 cucharada de miel
- **Horario sugerido:** 8:00 AM
- **Consejo de preparación:** Cocina la avena con agua o leche y añade las frutas y miel al servir.
- **Alternativa saludable:** Sustituye el plátano por manzana picada.

### Almuerzo
- **Ensalada de pollo a la parrilla**
  - 150g de pechuga de pollo
  - Mezcla de lechugas
  - Tomates cherry
  - Aderezo de aceite de oliva y limón
- **Horario sugerido:** 1:00 PM
- **Consejo de preparación:** Cocina el pollo a la parrilla con especias al gusto.
- **Alternativa saludable:** Usa tofu en lugar de pollo para una opción vegetariana.

### Cena
- **Salmón al horno con verduras**
  - 200g de salmón
  - Brócoli y zanahorias al vapor
  - 1/2 taza de quinoa
- **Horario sugerido:** 7:00 PM
- **Consejo de preparación:** Hornea el salmón con hierbas y limón durante 20 minutos.
- **Alternativa saludable:** Sustituye el salmón por tilapia o tempeh.

### Snacks
- **Media mañana:** Yogur natural con nueces.
- **Tarde:** Zanahorias baby con hummus.

### Hidratación
- **Agua:** Al menos 2 litros al día.
- **Alternativa saludable:** Infusiones de hierbas sin azúcar.

### Suplementos (si aplica)
- **Multivitamínico diario**
- **Proteína en polvo post-entrenamiento**
`
            }
          ]
        })
      });
      const data = await response.json();
      const newPlan = data.choices[0].message.content;

      await updateDoc(userDocRef, {
        mealPlan: newPlan,
        lastProcessedMealGoal: goal
      });
      setMealPlan(newPlan);
      setLastProcessedGoal(goal);
    } catch (error) {
      console.error('Error al generar el plan de alimentación:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="food-log">
      <h1>Plan de Alimentación</h1>
      {isLoading && (
        <div className="loading-container">
          <div className="lds-ring">
            <div></div><div></div><div></div><div></div>
          </div>
          <p>Generando tu plan de alimentación personalizado...</p>
        </div>
      )}
      {mealPlan && (
        <div className="meal-plan">
          <ReactMarkdown>{mealPlan}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default FoodLog;