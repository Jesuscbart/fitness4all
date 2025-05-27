import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, getDocs, setDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { sendExercisePlanEmail } from '../utils/emailService';
import './ExerciseLog.css'; // Añadido para aplicar los estilos

function ExerciseLog() {
  const { currentUser } = useContext(AuthContext);
  const [exercisePlan, setExercisePlan] = useState('');
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
    loadLastExercisePlan();
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

  // Función para cargar el último plan de entrenamiento
  const loadLastExercisePlan = async () => {
    try {
      setLoadingLastPlan(true);
      const exercisePlansRef = collection(db, 'users', currentUser.uid, 'exercise-plans');
      const q = query(exercisePlansRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastPlan = querySnapshot.docs[0].data();
        setExercisePlan(lastPlan.plan);
        setCurrentPlanTitle(lastPlan.questionnaireTitle);
        setSelectedQuestionnaire(lastPlan.questionnaireId);
      }
    } catch (error) {
      console.error('Error al cargar el último plan de entrenamiento:', error);
    } finally {
      setLoadingLastPlan(false);
    }
  };

  // Llama a la IA para generar un programa de ejercicios personalizado
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
              content: `Eres un entrenador personal especializado ÚNICAMENTE en diseñar rutinas de ejercicio. Tu única función es crear planes de entrenamiento semanales estructurados.

**INSTRUCCIONES ESTRICTAS:**
- Crea SOLAMENTE un plan de entrenamiento semanal en formato Markdown
- Comienza directamente con el primer día, sin introducción ni texto explicativo
- NO incluyas consejos nutricionales, de hidratación, sueño u otros temas
- NO uses tablas, solo listas con viñetas y encabezados
- Sigue EXACTAMENTE esta estructura fija para cada día:

**ESTRUCTURA OBLIGATORIA PARA DÍAS DE ENTRENAMIENTO:**
## [Día]: [Tipo de Entrenamiento]

### Calentamiento (10 minutos)
- [Ejercicio de calentamiento 1]
- [Ejercicio de calentamiento 2]
- [Ejercicio de calentamiento 3]

### Entrenamiento Principal
- **[Nombre del ejercicio]**: [Series] x [Repeticiones/Tiempo]
  - Descripción técnica breve
- **[Nombre del ejercicio]**: [Series] x [Repeticiones/Tiempo]
  - Descripción técnica breve

### Estiramiento (10 minutos)
- [Ejercicio de estiramiento 1]
- [Ejercicio de estiramiento 2]
- [Ejercicio de estiramiento 3]

**ESTRUCTURA OBLIGATORIA PARA DÍAS DE DESCANSO:**
## [Día]: Día de descanso

**REGLAS ABSOLUTAS:**
- Solo hablar de ejercicios y técnica de ejecución
- Respetar limitaciones médicas y equipamiento disponible
- Incluir exactamente los días de la semana que se considere en base a la disponibilidad del usuario
- Incluir días de descanso cuando sea apropiado usando la estructura simple indicada
- No dar consejos generales fuera del entrenamiento
- Mantener consistencia en el formato
- Comenzar directamente con "## Lunes:" sin texto previo

Basa el plan únicamente en el perfil de entrenamiento del usuario:`
            },
            {
              role: 'user',
              content: selectedQuestionnaireData.prompt + '\n\nCrea un plan de entrenamiento semanal siguiendo exactamente la estructura especificada.'
            }
          ]
        })
      });
      
      const data = await response.json();
      const newPlan = data.choices[0].message.content;

      // Guardar el plan en Firebase
      const planDocRef = doc(collection(db, 'users', currentUser.uid, 'exercise-plans'));
      await setDoc(planDocRef, {
        plan: newPlan,
        questionnaireId: selectedQuestionnaire,
        questionnaireTitle: selectedQuestionnaireData.title,
        createdAt: Timestamp.now(),
        timestamp: Timestamp.now()
      });

      setExercisePlan(newPlan);
      setCurrentPlanTitle(selectedQuestionnaireData.title);
      
      console.log('='.repeat(80));
      console.log('PLAN DE EJERCICIOS GENERADO Y GUARDADO');
      console.log('Basado en:', selectedQuestionnaireData.title);
      console.log('='.repeat(80));
      console.log(newPlan);
      console.log('='.repeat(80));

    } catch (error) {
      console.error('Error al generar el plan de ejercicios:', error);
      alert('Error al generar el plan de ejercicios. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para enviar el plan por correo electrónico
  const handleSendEmailPlan = async () => {
    if (!exercisePlan || !currentUser) {
      alert('No hay plan de entrenamiento para enviar o usuario no autenticado.');
      return;
    }

    setSendingEmail(true);
    try {
      const emailData = {
        to: currentUser.email,
        subject: `Tu Plan de Entrenamiento Personalizado - ${currentPlanTitle}`,
        planContent: exercisePlan,
        planTitle: currentPlanTitle || 'Plan de Entrenamiento Personalizado',
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario'
      };

      // Llamada al servicio de email
      const result = await sendExercisePlanEmail(emailData);
      
      if (result.success) {
        setShowEmailModal(false);
        console.log('✅ Email enviado exitosamente');
        setEmailSentMessage('¡Plan de entrenamiento enviado exitosamente!');
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
    <div className="exercise-log">
      <h1>Plan de Ejercicios Personalizado</h1>
      
      <div className="questionnaire-selector-section">
        <h2>Selecciona tu cuestionario</h2>
        <p>Elige el cuestionario en base al cual quieres generar tu plan de ejercicios personalizado.</p>
        
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
              {isLoading ? 'Generando plan...' : 'Generar Plan de Ejercicios'}
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
          <p>Creando tu plan de ejercicios personalizado...</p>
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
          <p>Cargando tu último plan de entrenamiento...</p>
        </div>
      )}

      {exercisePlan && !loadingLastPlan && (
        <div className="exercise-plan">
          <div className="plan-header">
            <h2>Tu Plan de Ejercicios</h2>
            <p>Basado en: <strong>{currentPlanTitle || questionnaires.find(q => q.id === selectedQuestionnaire)?.title}</strong></p>
          </div>
          <ReactMarkdown>{exercisePlan}</ReactMarkdown>
          
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
                  <span>{currentPlanTitle || 'Plan de entrenamiento personalizado'}</span>
                </div>
              </div>
              <div className="email-note">
                <p>💡 Recibirás tu plan de entrenamiento, listo para consultar desde cualquier dispositivo.</p>
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

export default ExerciseLog;