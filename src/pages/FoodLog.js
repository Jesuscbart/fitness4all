import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, setDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { sendNutritionPlanEmail } from '../utils/emailService';
import './FoodLog.css';

function FoodLog() {
  const { currentUser } = useContext(AuthContext);
  const [nutritionPlan, setNutritionPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para los cuestionarios
  const [questionnaires, setQuestionnaires] = useState([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState('');
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);
  
  // Estados para el plan actual
  const [currentPlanTitle, setCurrentPlanTitle] = useState('');
  const [loadingLastPlan, setLoadingLastPlan] = useState(true);
  
  // Estados para el modal de envío por email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');

  // Cargar cuestionarios y último plan al montar el componente
  useEffect(() => {
    if (!currentUser) return;
    loadQuestionnaires();
    loadLastNutritionPlan();
  }, [currentUser]);

  // Función para cargar los cuestionarios desde Firebase
  const loadQuestionnaires = async () => {
    try {
      setLoadingQuestionnaires(true);
      const questionnairesRef = collection(db, 'users', currentUser.uid, 'questionnaires');
      const querySnapshot = await getDocs(questionnairesRef);
      
      const questionnairesList = [];
      querySnapshot.forEach((doc) => {
        questionnairesList.push({
          id: doc.id,
          title: doc.data().title,
          prompt: doc.data().prompt,
          createdAt: doc.data().createdAt
        });
      });

      // Ordenar por fecha de creación (más reciente primero)
      questionnairesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setQuestionnaires(questionnairesList);
    } catch (error) {
      console.error('Error al cargar los cuestionarios:', error);
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  // Función para cargar el último plan de nutrición
  const loadLastNutritionPlan = async () => {
    try {
      setLoadingLastPlan(true);
      const nutritionPlansRef = collection(db, 'users', currentUser.uid, 'nutrition-plans');
      const q = query(nutritionPlansRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastPlan = querySnapshot.docs[0].data();
        setNutritionPlan(lastPlan.plan);
        setCurrentPlanTitle(lastPlan.questionnaireTitle);
        setSelectedQuestionnaire(lastPlan.questionnaireId);
      }
    } catch (error) {
      console.error('Error al cargar el último plan de nutrición:', error);
    } finally {
      setLoadingLastPlan(false);
    }
  };

  // Llama a la IA para generar un plan de alimentación personalizado
  const handleGeneratePlan = async () => {
    if (!selectedQuestionnaire) {
      alert('Por favor, selecciona un cuestionario primero.');
      return;
    }

    setIsLoading(true);
    try {
      const selectedQuestionnaireData = questionnaires.find(q => q.id === selectedQuestionnaire);
      if (!selectedQuestionnaireData) {
        throw new Error('Cuestionario no encontrado');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `Eres un nutricionista certificado especializado ÚNICAMENTE en diseñar planes de alimentación. Tu única función es crear planes nutricionales semanales estructurados.

**INSTRUCCIONES ESTRICTAS:**
- Crea SOLAMENTE un plan de alimentación semanal en formato Markdown
- Comienza directamente con el primer día, sin introducción ni texto explicativo
- NO incluyas consejos de ejercicio, sueño u otros temas fuera de la nutrición
- NO uses tablas, solo listas con viñetas y encabezados
- Sigue EXACTAMENTE esta estructura fija para cada día:

**ESTRUCTURA OBLIGATORIA PARA CADA DÍA:**
## [Día de la semana]

### Desayuno
- **[Nombre del plato/comida]**
  - [Ingrediente 1]: [cantidad]
  - [Ingrediente 2]: [cantidad]
  - **Macros:** [proteínas, carbohidratos, grasas]
  - **Preparación:** [instrucciones breves]

### Comida
- **[Nombre del plato/comida]**
  - [Ingrediente 1]: [cantidad]
  - [Ingrediente 2]: [cantidad]
  - **Macros:** [proteínas, carbohidratos, grasas]
  - **Preparación:** [instrucciones breves]

### Cena
- **[Nombre del plato/comida]**
  - [Ingrediente 1]: [cantidad]
  - [Ingrediente 2]: [cantidad]
  - **Macros:** [proteínas, carbohidratos, grasas]
  - **Preparación:** [instrucciones breves]

### Snacks
- **Media mañana:** [snack saludable]
- **Media tarde:** [snack saludable]

### Hidratación
- **Agua:** [cantidad recomendada]

**REGLAS ABSOLUTAS:**
- Solo hablar de alimentación, nutrición e hidratación
- Respetar restricciones alimentarias y preferencias del usuario
- Incluir exactamente los 7 días de la semana (Lunes a Domingo)
- Proporcionar cantidades específicas y realistas
- Mantener consistencia en el formato
- Comenzar directamente con "## Lunes" sin texto previo
- Asegurar variedad en los menús a lo largo de la semana
- Considerar el objetivo nutricional del usuario (perder peso, ganar músculo, etc.)
- Incluir preparaciones sencillas y prácticas

Basa el plan únicamente en el perfil nutricional del usuario:`
            },
            {
              role: 'user',
              content: selectedQuestionnaireData.prompt + '\n\nCrea un plan de alimentación semanal siguiendo exactamente la estructura especificada.'
            }
          ]
        })
      });
      
      const data = await response.json();
      const newPlan = data.choices[0].message.content;

      // Guardar el plan en Firebase
      const planDocRef = doc(collection(db, 'users', currentUser.uid, 'nutrition-plans'));
      await setDoc(planDocRef, {
        plan: newPlan,
        questionnaireId: selectedQuestionnaire,
        questionnaireTitle: selectedQuestionnaireData.title,
        createdAt: Timestamp.now(),
        timestamp: Timestamp.now()
      });

      setNutritionPlan(newPlan);
      setCurrentPlanTitle(selectedQuestionnaireData.title);
      
      console.log('='.repeat(80));
      console.log('PLAN DE ALIMENTACIÓN GENERADO Y GUARDADO');
      console.log('Basado en:', selectedQuestionnaireData.title);
      console.log('='.repeat(80));
      console.log(newPlan);
      console.log('='.repeat(80));

    } catch (error) {
      console.error('Error al generar el plan de alimentación:', error);
      alert('Error al generar el plan de alimentación. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para enviar el plan por correo electrónico
  const handleSendEmailPlan = async () => {
    if (!nutritionPlan || !currentUser) {
      alert('No hay plan de alimentación para enviar o usuario no autenticado.');
      return;
    }

    setSendingEmail(true);
    try {
      const emailData = {
        to: currentUser.email,
        subject: `Tu Plan de Alimentación Personalizado - ${currentPlanTitle}`,
        planContent: nutritionPlan,
        planTitle: currentPlanTitle || 'Plan de Alimentación Personalizado',
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario'
      };

      // Llamada al servicio de email
      const result = await sendNutritionPlanEmail(emailData);
      
      if (result.success) {
        setShowEmailModal(false);
        console.log('✅ Email enviado exitosamente');
        setEmailSentMessage('¡Plan de alimentación enviado exitosamente!');
        setTimeout(() => setEmailSentMessage(''), 5000);
      } else {
        throw new Error('El servicio de email no pudo procesar la solicitud');
      }
      
    } catch (error) {
      console.error('Error al enviar el email:', error);
      alert('Error al enviar el plan por correo electrónico. Por favor, inténtalo de nuevo.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="food-log">
      <h1>Plan de Alimentación Personalizado</h1>
      
      <div className="questionnaire-selector-section">
        <h2>Selecciona tu cuestionario</h2>
        <p>Elige el cuestionario en base al cual quieres generar tu plan de alimentación personalizado.</p>
        
        {loadingQuestionnaires ? (
          <div className="loading-message">
            <p>Cargando cuestionarios...</p>
          </div>
        ) : questionnaires.length === 0 ? (
          <div className="no-questionnaires">
            <p>No tienes cuestionarios guardados. Ve al Dashboard para completar tu primer cuestionario.</p>
          </div>
        ) : (
          <div className="selector-container">
            <div className="form-group">
              <label htmlFor="questionnaire-select">Cuestionario:</label>
              <select 
                id="questionnaire-select"
                value={selectedQuestionnaire}
                onChange={(e) => setSelectedQuestionnaire(e.target.value)}
                className="questionnaire-select"
              >
                <option value="">Selecciona un cuestionario...</option>
                {questionnaires.map((questionnaire) => (
                  <option key={questionnaire.id} value={questionnaire.id}>
                    {questionnaire.title}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleGeneratePlan}
              disabled={!selectedQuestionnaire || isLoading}
              className="generate-plan-btn"
            >
              {isLoading ? 'Generando plan...' : 'Generar Plan de Alimentación'}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-container">
          <div className="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p>Creando tu plan de alimentación personalizado...</p>
        </div>
      )}
      
      {loadingLastPlan && (
        <div className="loading-container">
          <div className="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p>Cargando tu último plan de alimentación...</p>
        </div>
      )}

      {nutritionPlan && !loadingLastPlan && (
        <div className="nutrition-plan">
          <div className="plan-header">
            <h2>Tu Plan de Alimentación</h2>
            <p>Basado en: <strong>{currentPlanTitle || questionnaires.find(q => q.id === selectedQuestionnaire)?.title}</strong></p>
          </div>
          <ReactMarkdown>{nutritionPlan}</ReactMarkdown>
          
          <div className="plan-actions">
            <button 
              onClick={() => setShowEmailModal(true)}
              className="email-plan-btn"
              disabled={sendingEmail}
            >
              📧 Enviar Plan por Email
            </button>
            
            {emailSentMessage && (
              <div className="email-sent-message">
                <p>{emailSentMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación para envío por email */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="email-modal">
            <div className="modal-header">
              <h3>📧 Enviar Plan por Email</h3>
              <button 
                className="close-button-modern" 
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
              >
                <span>✕</span>
              </button>
            </div>
            
            <div className="email-info">
              <div className="email-details">
                <div className="detail-item">
                  <strong>Correo de destino:</strong>
                  <span className="email-address">{currentUser?.email}</span>
                </div>
                <div className="detail-item">
                  <strong>Plan:</strong>
                  <span>{currentPlanTitle || 'Plan de alimentación personalizado'}</span>
                </div>
              </div>
              <div className="email-note">
                <p>💡 Recibirás tu plan de alimentación con recetas y consejos nutricionales para toda la semana.</p>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={handleSendEmailPlan}
                className="confirm-send-btn"
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <div className="sending-spinner"></div>
                    Enviando...
                  </>
                ) : (
                  '✅ Confirmar Envío'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodLog;