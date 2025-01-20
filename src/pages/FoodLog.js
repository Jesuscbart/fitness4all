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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `
Eres un nutricionista experto.
Basándote en el siguiente objetivo:
"${goal}"
Elabora un plan de alimentación semanal detallado en formato Markdown que ayude
al usuario a alcanzar sus objetivos. Incluye:

- Menús diarios para los 7 días de la semana
- Porciones aproximadas
- Horarios sugeridos de comida
- Tips de preparación básicos
- Alternativas saludables para algunos ingredientes

Usa formatos, listas y estructura clara para fácil lectura.
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
