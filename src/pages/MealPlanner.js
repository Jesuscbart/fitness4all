import React, { useState, useEffect, useContext } from 'react';
import './MealPlanner.css';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, limit } from 'firebase/firestore';

function MealPlanner() {
  const { currentUser } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mealTitle, setMealTitle] = useState('');
  const [mealIngredients, setMealIngredients] = useState('');
  const [mealMacros, setMealMacros] = useState('');
  const [meals, setMeals] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [savedMealPlan, setSavedMealPlan] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState([]); // Por defecto sin semanas seleccionadas
  const [currentWeek, setCurrentWeek] = useState(0); // Almacena el número de la semana actual
  const [successMessage, setSuccessMessage] = useState(''); // Estado para el mensaje de éxito
  const [weeksInMonth, setWeeksInMonth] = useState([]); // Array con los números de semana del mes
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // Estado para el modal de confirmación
  
  // Nombres de los meses en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Nombres de los días en español
  const dayNames = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  
  // Carga el plan de comidas guardado cuando se monta el componente
  useEffect(() => {
    if (currentUser) {
      fetchSavedMealPlan();
    }
  }, [currentUser]);

  // Calcula la semana actual al cargar el componente
  useEffect(() => {
    const today = new Date();
    const weekOfMonth = getWeekOfMonth(today);
    setCurrentWeek(weekOfMonth);
  }, []);
  
  // Obtiene el plan de comidas guardado en Firestore
  const fetchSavedMealPlan = async () => {
    try {
      // Buscar en la nueva colección nutrition-plans en lugar del documento del usuario
      const nutritionPlansRef = collection(db, 'users', currentUser.uid, 'nutrition-plans');
      const q = query(nutritionPlansRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const lastPlan = querySnapshot.docs[0].data();
        setSavedMealPlan(lastPlan.plan);
      } else {
        setSavedMealPlan('');
      }
    } catch (error) {
      console.error('Error al obtener el plan de comidas:', error);
    }
  };

  // Calcula el número de semanas en el mes actual
  const calculateWeeksInMonth = (year, month) => {
    // Primer día del mes
    const firstDayOfMonth = new Date(year, month, 1);
    // Último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Obtener la semana del último día del mes
    const lastWeek = getWeekOfMonth(lastDayOfMonth);
    
    // Crear un array con los números de semana
    return Array.from({ length: lastWeek }, (_, i) => i + 1);
  };
  
  // Genera los días del calendario para el mes actual
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Primer día del mes
    const firstDayOfMonth = new Date(year, month, 1);
    // Último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Ajusta el día de la semana (0 = Domingo -> 6, 1 = Lunes -> 0...)
    let firstWeekday = firstDayOfMonth.getDay() - 1;
    if (firstWeekday < 0) firstWeekday = 6; // Si es domingo (0), ajustamos a 6
    
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Crear array con los días del mes y espacios en blanco para completar
    const days = [];
    
    // Añadir espacios en blanco para los días antes del primer día del mes
    for (let i = 0; i < firstWeekday; i++) {
      days.push(null);
    }
    
    // Añadir todos los días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    setCalendarDays(days);
    
    // Calcular el número de semanas en el mes
    const weeks = calculateWeeksInMonth(year, month);
    setWeeksInMonth(weeks);
    
    // Cargar datos del mes actual cuando cambia el mes
    if (currentUser) {
      loadMeals(year, month);
    }
  }, [currentDate, currentUser]);
  
  // Cargar las comidas almacenadas en Firebase
  const loadMeals = async (year, month) => {
    setIsLoading(true);
    try {
      const calendarId = `${year}-${month + 1}`;
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      const calendarDoc = await getDoc(calendarDocRef);
      
      if (calendarDoc.exists()) {
        setMeals(calendarDoc.data());
      } else {
        setMeals({});
      }
    } catch (error) {
      console.error('Error al cargar las comidas:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cambia al mes anterior
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  // Cambia al mes siguiente
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Verifica si un día es hoy
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Verifica si estamos en el mes actual
  const isCurrentMonth = () => {
    const today = new Date();
    return currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  // Abre el modal con la información de la comida seleccionada
  const openMealModal = (date, mealType) => {
    const dayKey = date.getDate().toString();
    const mealData = meals[dayKey] && meals[dayKey][mealType];
    
    setSelectedMeal({
      date,
      mealType,
      formattedDate: `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`
    });
    
    setMealTitle(mealData ? mealData.title : '');
    setMealIngredients(mealData ? mealData.ingredients : '');
    setMealMacros(mealData ? mealData.macros : '');
    setIsModalOpen(true);
  };

  // Cierra el modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMeal(null);
    setMealTitle('');
    setMealIngredients('');
    setMealMacros('');
  };

  // Formatea el tipo de comida para mostrar en español
  const formatMealType = (mealType) => {
    switch(mealType) {
      case 'breakfast':
        return 'Desayuno';
      case 'lunch':
        return 'Comida';
      case 'dinner':
        return 'Cena';
      default:
        return '';
    }
  };
  
  // Guarda la comida en Firebase
  const saveMeal = async () => {
    if (!selectedMeal) return;
    
    const year = selectedMeal.date.getFullYear();
    const month = selectedMeal.date.getMonth();
    const day = selectedMeal.date.getDate().toString();
    const calendarId = `${year}-${month + 1}`;
    
    try {
      // Crear un objeto con los datos actualizados
      const updatedMeals = { ...meals };
      
      if (!updatedMeals[day]) {
        updatedMeals[day] = {};
      }
      
      updatedMeals[day][selectedMeal.mealType] = {
        title: mealTitle,
        ingredients: mealIngredients,
        macros: mealMacros
      };
      
      // Guardar en Firebase
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      await setDoc(calendarDocRef, updatedMeals);
      
      // Actualizar el estado local para mostrar los cambios inmediatamente
      setMeals(updatedMeals);
      closeModal();
    } catch (error) {
      console.error('Error al guardar la comida:', error);
    }
  };

  // Elimina la comida seleccionada
  const deleteMeal = async () => {
    if (!selectedMeal) return;
    
    const year = selectedMeal.date.getFullYear();
    const month = selectedMeal.date.getMonth();
    const day = selectedMeal.date.getDate().toString();
    const calendarId = `${year}-${month + 1}`;
    
    try {
      // Crear un objeto con los datos actualizados
      const updatedMeals = { ...meals };
      
      // Verificar si existe el día y la comida
      if (updatedMeals[day] && updatedMeals[day][selectedMeal.mealType]) {
        // Eliminar la comida
        delete updatedMeals[day][selectedMeal.mealType];
        
        // Si no quedan comidas en ese día, eliminar el objeto del día
        if (Object.keys(updatedMeals[day]).length === 0) {
          delete updatedMeals[day];
        }
        
        // Guardar en Firebase
        const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
        await setDoc(calendarDocRef, updatedMeals);
        
        // Actualizar el estado local
        setMeals(updatedMeals);
        
        // Mostrar mensaje de éxito
        setSuccessMessage('Comida eliminada correctamente');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        closeModal();
      }
    } catch (error) {
      console.error('Error al eliminar la comida:', error);
    }
  };
  
  // Recupera los datos de comida para mostrar en las tarjetas
  const getMealData = (date, mealType) => {
    if (!date) return null;
    
    const dayKey = date.getDate().toString();
    return meals[dayKey] && meals[dayKey][mealType];
  };

  // Determina a qué semana del mes pertenece un día
  const getWeekOfMonth = (date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    // Ajustar al lunes previo si el primer día no es lunes (0 es domingo, 1 es lunes, etc.)
    const dayOfWeek = firstDayOfMonth.getDay() || 7; // Convertir domingo (0) a 7
    const offset = dayOfWeek - 1; // Offset para ajustar al lunes
    
    // Calcular el número de la semana
    const day = date.getDate();
    return Math.ceil((day + offset) / 7);
  };

  // Procesa el plan de comidas con IA
  const processMealPlanWithAI = async () => {
    if (!savedMealPlan) {
      alert('No hay plan de comidas guardado para procesar');
      return;
    }
    
    if (selectedWeeks.length === 0) {
      alert('Por favor, selecciona al menos una semana para aplicar el plan');
      return;
    }
    
    setIsProcessingAI(true);
    try {
      // Usar el mes seleccionado en el calendario
      const selectedYear = currentDate.getFullYear();
      const selectedMonth = currentDate.getMonth();
      const selectedMonthName = monthNames[selectedMonth];
      
      // Calcular todos los días del mes seleccionado y organizarlos por día de la semana
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const daysOfWeekMap = {
        "Lunes": [],
        "Martes": [],
        "Miercoles": [],
        "Jueves": [],
        "Viernes": [],
        "Sabado": [],
        "Domingo": []
      };
      
      // Llenar el mapa con los números de días correspondientes a cada día de la semana
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        // getDay() devuelve 0 para domingo, 1 para lunes, etc.
        // Convertimos a nuestro formato donde 0 es lunes, 1 es martes, etc.
        const dayOfWeekIndex = (date.getDay() + 6) % 7;
        const dayName = dayNames[dayOfWeekIndex];
        daysOfWeekMap[dayName].push(day);
      }
      
      // Crear un JSON con los días organizados por día de la semana para la API
      const daysMapping = {};
      Object.entries(daysOfWeekMap).forEach(([dayName, days]) => {
        daysMapping[dayName] = days;
      });
      
      console.log(`Mapeo de días para el mes ${selectedMonthName}:`, daysMapping);
      
      // Enviar solicitud a la API de OpenAI
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
              content: `Eres un asistente especializado en procesamiento de datos nutricionales. Tu tarea es convertir un plan de comidas en formato Markdown estructurado a un formato JSON para un calendario MENSUAL.

              A continuación te proporciono un mapeo de los días del mes ${selectedMonthName} de ${selectedYear} con su día de la semana correspondiente:
              ${JSON.stringify(daysMapping, null, 2)}
              
              Por ejemplo, en este mes, los días ${daysMapping["Lunes"].join(", ")} son lunes.
              
              El plan de entrada tiene la siguiente estructura por día:
              ## [Día de la semana]
              ### Desayuno
              - **[Nombre del plato]**
              - [Ingrediente]: [cantidad]
              - [Ingrediente]: [cantidad]
              - **Macros:** [proteínas, carbohidratos, grasas]
              - **Preparación:** [instrucciones]
              
              ### Comida / ### Cena
              [Misma estructura que desayuno]
              
              ### Snacks
              - **Media mañana:** [snack]
              - **Media tarde:** [snack]
              
              ### Hidratación
              - **Agua:** [cantidad]
              
              Tu tarea es:
              1. Identificar cada día de la semana mencionado en el plan (Lunes, Martes, etc.)
              2. Extraer el nombre del plato principal para breakfast, lunch y dinner
              3. Extraer los ingredientes CON sus cantidades exactas
              4. Extraer la información de macros (proteínas, carbohidratos, grasas)
              5. Asignar cada comida a TODOS los días del mes que corresponden a ese día de la semana
              
              REGLAS IMPORTANTES:
              - Para el título: usa solo el nombre del plato que está después de los asteriscos **
              - Para los ingredientes: incluye cada ingrediente con su cantidad exacta, separados por comas
              - Para los macros: extrae exactamente la información que aparece después de "**Macros:**"
              - NO incluyas información de preparación o hidratación
              - Asigna las comidas a TODOS los días del mes que sean del mismo día de la semana
              
              Ejemplo de salida esperada:
              {
                "1": {
                  "breakfast": {
                    "title": "Tortilla de claras con avena y plátano",
                    "ingredients": "Claras de huevo: 5 unidades, Avena integral: 50 g, Plátano: 1 mediano (120 g)",
                    "macros": "35 g proteínas, 55 g carbohidratos, 8 g grasas"
                  },
                  "lunch": {
                    "title": "Pasta integral con pechuga de pollo y verduras",
                    "ingredients": "Pasta integral: 80 g (peso seco), Pechuga de pollo: 150 g, Brócoli: 100 g, Aceite de oliva: 1 cucharada (10 ml)",
                    "macros": "45 g proteínas, 60 g carbohidratos, 12 g grasas"
                  },
                  "dinner": {
                    "title": "Ensalada de atún con quinoa y aguacate",
                    "ingredients": "Atún en agua: 120 g, Quinoa cocida: 70 g, Aguacate: 50 g, Tomate cherry: 50 g",
                    "macros": "35 g proteínas, 30 g carbohidratos, 15 g grasas"
                  }
                }
              }
              
              IMPORTANTE: Proporciona SOLAMENTE el JSON válido en tu respuesta, sin etiquetas markdown como \`\`\`json o \`\`\`, sin comentarios ni texto adicional.`
            },
            {
              role: 'user',
              content: `Aquí está el plan de comidas. Conviértelo al formato JSON solicitado, asegurándote de asignar cada comida EXACTAMENTE al día de la semana correcto según el plan:

${savedMealPlan}`
            }
          ]
        })
      });
      
      const data = await response.json();
      let jsonResponse = data.choices[0].message.content;
      
      // Limpiar la respuesta para asegurarnos de que sea un JSON válido
      console.log('Respuesta original de la API:', jsonResponse);
      
      // Eliminar etiquetas de código markdown si existen
      if (jsonResponse.includes('```')) {
        // Extraer el contenido entre bloques de código markdown
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
        const match = jsonResponse.match(codeBlockRegex);
        
        if (match && match[1]) {
          // Si encontramos un bloque de código, usamos su contenido
          jsonResponse = match[1].trim();
        } else {
          // Si no hay un bloque bien formado, eliminamos todas las líneas con ```
          jsonResponse = jsonResponse.split('\n')
            .filter(line => !line.includes('```'))
            .join('\n');
        }
      }
      
      // Eliminar cualquier otro texto antes o después del JSON
      jsonResponse = jsonResponse.trim();
      
      // Asegurarse de que el primer caracter sea {
      const firstBraceIndex = jsonResponse.indexOf('{');
      const lastBraceIndex = jsonResponse.lastIndexOf('}');
      
      if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
        jsonResponse = jsonResponse.substring(firstBraceIndex, lastBraceIndex + 1);
      }
      
      console.log('JSON procesado:', jsonResponse);
      
      // Parsear el JSON limpio
      const formattedMealPlan = JSON.parse(jsonResponse);
      
      // Verificar si formattedMealPlan es un objeto válido
      if (typeof formattedMealPlan !== 'object' || formattedMealPlan === null) {
        throw new Error('La respuesta no es un objeto JSON válido');
      }
      
      // Guardar el plan formateado en Firebase usando el mes seleccionado
      const calendarId = `${selectedYear}-${selectedMonth + 1}`;
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      
      // Verificar si ya existen comidas para este mes
      const calendarDoc = await getDoc(calendarDocRef);
      let existingMeals = {};
      
      if (calendarDoc.exists()) {
        existingMeals = calendarDoc.data();
      }
      
      // Filtrar solo los días que pertenecen a las semanas seleccionadas
      const filteredMealPlan = {};
      
      // Recorrer todos los días del mes seleccionado
      Object.keys(formattedMealPlan).forEach(day => {
        // Convertir el día a objeto Date
        const date = new Date(selectedYear, selectedMonth, parseInt(day));
        // Obtener la semana del mes
        const weekOfMonth = getWeekOfMonth(date);
        
        // Solo incluir este día si su semana está seleccionada
        if (selectedWeeks.includes(weekOfMonth)) {
          filteredMealPlan[day] = formattedMealPlan[day];
        }
      });
      
      // Combinar las comidas existentes con las nuevas
      const combinedMeals = { ...existingMeals, ...filteredMealPlan };
      
      // Guardar en Firebase en el mes seleccionado
      await setDoc(calendarDocRef, combinedMeals);
      
      // Actualizar el estado local para mostrar los cambios inmediatamente
      setMeals(combinedMeals);
      
      // Mostrar mensaje de éxito personalizado
      setSuccessMessage(`¡Plan de comidas añadido al calendario de ${selectedMonthName} ${selectedYear} con éxito!`);
      
      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('Error al procesar el plan de comidas:', error);
      setSuccessMessage('Error al procesar el plan de comidas. Por favor, inténtalo de nuevo.');
      
      // Ocultar el mensaje de error después de 5 segundos
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Función para manejar cambios en las checkboxes de las semanas
  const handleWeekSelection = (weekNumber) => {
    if (selectedWeeks.includes(weekNumber)) {
      // Si ya está seleccionada, la quitamos
      setSelectedWeeks(selectedWeeks.filter(week => week !== weekNumber));
    } else {
      // Si no está seleccionada, la añadimos
      setSelectedWeeks([...selectedWeeks, weekNumber].sort());
    }
  };

  // Función para vaciar el mes actual
  const clearCurrentMonth = async () => {
    setIsConfirmModalOpen(false); // Cierra el modal de confirmación
    
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const calendarId = `${year}-${month + 1}`;
      
      // Referencia al documento del calendario actual
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      
      // Establecer un objeto vacío para borrar todas las comidas
      await setDoc(calendarDocRef, {});
      
      // Actualizar el estado local
      setMeals({});
      
      // Mostrar mensaje de éxito
      setSuccessMessage('Se han eliminado todas las comidas del mes');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error al vaciar el mes:', error);
      setSuccessMessage('Error al eliminar las comidas. Por favor, inténtalo de nuevo.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
  };

  // Abre el modal de confirmación para vaciar el mes
  const openConfirmModal = () => {
    setIsConfirmModalOpen(true);
  };
  
  // Cierra el modal de confirmación
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="meal-planner">
      <h1>Planificador de Comidas</h1>
      
      <div className="ai-import-section">
        <button 
          className="ai-import-button" 
          onClick={processMealPlanWithAI}
          disabled={isProcessingAI || !savedMealPlan || selectedWeeks.length === 0}
        >
          {isProcessingAI ? (
            <>
              <div className="loading-spinner"></div>
              Procesando...
            </>
          ) : (
            'Importar Plan de Comidas'
          )}
        </button>
      </div>
      
      <div className="weeks-selection">
        <p>Selecciona las semanas para aplicar el plan:</p>
        <div className="weeks-checkboxes">
          {weeksInMonth.map(week => (
            <label 
              key={week} 
              className={`week-checkbox-label ${isCurrentMonth() && week === currentWeek ? 'current-week' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedWeeks.includes(week)}
                onChange={() => handleWeekSelection(week)}
              />
              Semana {week} {isCurrentMonth() && week === currentWeek ? '(actual)' : ''}
            </label>
          ))}
        </div>
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
      </div>
      
      <div className="calendar-controls">
        <button onClick={goToPreviousMonth}>&laquo; Anterior</button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={goToNextMonth}>Siguiente &raquo;</button>
      </div>
      
      {isLoading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="calendar">
          <div className="calendar-header">
            {dayNames.map(day => (
              <div key={day} className="calendar-cell day-name">{day}</div>
            ))}
          </div>
          
          <div className="calendar-body">
            {calendarDays.map((day, index) => (
              <div 
                key={index}
                className={`calendar-cell ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''}`}
              >
                {day && (
                  <>
                    <div className="day-number">{day.getDate()}</div>
                    <div className="meal-sections">
                      <div className="meal-section" onClick={() => openMealModal(day, 'breakfast')}>
                        <div className="meal-card">
                          {getMealData(day, 'breakfast') ? (
                            <div className="meal-info">
                              <span className="meal-title">{getMealData(day, 'breakfast').title}</span>
                            </div>
                          ) : (
                            <span className="meal-icon">🥐</span>
                          )}
                        </div>
                      </div>
                      <div className="meal-section" onClick={() => openMealModal(day, 'lunch')}>
                        <div className="meal-card">
                          {getMealData(day, 'lunch') ? (
                            <div className="meal-info">
                              <span className="meal-title">{getMealData(day, 'lunch').title}</span>
                            </div>
                          ) : (
                            <span className="meal-icon">🥗</span>
                          )}
                        </div>
                      </div>
                      <div className="meal-section" onClick={() => openMealModal(day, 'dinner')}>
                        <div className="meal-card">
                          {getMealData(day, 'dinner') ? (
                            <div className="meal-info">
                              <span className="meal-title">{getMealData(day, 'dinner').title}</span>
                            </div>
                          ) : (
                            <span className="meal-icon">🌙</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón para vaciar el mes actual */}
      <div className="clear-month-container">
        <button className="clear-month-button" onClick={openConfirmModal}>
          🗑️ Vaciar mes actual
        </button>
      </div>

      {/* Modal de edición de comida */}
      {isModalOpen && selectedMeal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>×</button>
            <h3>{formatMealType(selectedMeal.mealType)} - {selectedMeal.formattedDate}</h3>
            <div className="meal-form">
              <div className="form-group">
                <label>Título:</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ensalada mediterránea" 
                  value={mealTitle}
                  onChange={(e) => setMealTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Ingredientes:</label>
                <textarea 
                  placeholder="Ej: 200g de lechuga, 100g de tomate..."
                  value={mealIngredients}
                  onChange={(e) => setMealIngredients(e.target.value)}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Macros:</label>
                <textarea 
                  placeholder="Ej: 35 g proteínas, 55 g carbohidratos, 8 g grasas"
                  value={mealMacros}
                  onChange={(e) => setMealMacros(e.target.value)}
                ></textarea>
              </div>
              <div className="form-actions">
                <button className="delete-button" onClick={deleteMeal}>Eliminar</button>
                <button className="save-button" onClick={saveMeal}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para vaciar el mes */}
      {isConfirmModalOpen && (
        <div className="confirmation-modal-overlay" onClick={closeConfirmModal}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar todas las comidas del mes de {monthNames[currentDate.getMonth()]}?</p>
            <p>Esta acción no se puede deshacer.</p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={closeConfirmModal}>Cancelar</button>
              <button className="confirm-button" onClick={clearCurrentMonth}>Eliminar todo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlanner; 