import React, { useState, useEffect, useContext } from 'react';
import './MealPlanner.css';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

function MealPlanner() {
  const { currentUser } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mealTitle, setMealTitle] = useState('');
  const [mealIngredients, setMealIngredients] = useState('');
  const [meals, setMeals] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [savedMealPlan, setSavedMealPlan] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState([1, 2, 3, 4, 5, 6]); // Por defecto todas las semanas seleccionadas
  
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
  
  // Obtiene el plan de comidas guardado en Firestore
  const fetchSavedMealPlan = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().mealPlan) {
        setSavedMealPlan(userDoc.data().mealPlan);
      }
    } catch (error) {
      console.error('Error al obtener el plan de comidas:', error);
    }
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
    setIsModalOpen(true);
  };

  // Cierra el modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMeal(null);
    setMealTitle('');
    setMealIngredients('');
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
        ingredients: mealIngredients
      };
      
      // Guardar en Firebase
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      await setDoc(calendarDocRef, updatedMeals);
      
      // Actualizar el estado local
      setMeals(updatedMeals);
      closeModal();
    } catch (error) {
      console.error('Error al guardar la comida:', error);
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
      // Obtener la fecha actual para determinar la semana
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const currentMonthName = monthNames[currentMonth];
      
      // Calcular todos los días del mes y organizarlos por día de la semana
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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
        const date = new Date(currentYear, currentMonth, day);
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
      
      console.log("Mapeo de días para el mes:", daysMapping);
      
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
              content: `Eres un asistente especializado en procesamiento de datos. Tu tarea es convertir un plan de comidas en formato Markdown a un formato JSON estructurado para un calendario MENSUAL.

              A continuación te proporciono un mapeo de los días del mes actual (${currentMonthName}) con su día de la semana correspondiente:
              ${JSON.stringify(daysMapping, null, 2)}
              
              Por ejemplo, en este mes, los días ${daysMapping["Lunes"].join(", ")} son lunes.
              
              Tu tarea es asignar cada comida del plan al día EXACTO que corresponde según el día de la semana mencionado en el plan.
              
              Por ejemplo:
              - Si el plan menciona "Lunes: Huevos revueltos", debes asignar esta comida a TODOS los días que son lunes (${daysMapping["Lunes"].join(", ")}).
              - Si menciona "Fin de semana" o específicamente "Sábado"/"Domingo", debes asignar esas comidas solo a los días que son sábado (${daysMapping["Sabado"].join(", ")}) o domingo (${daysMapping["Domingo"].join(", ")}).
              
              El formato de salida debe ser un objeto JSON donde cada clave es el número del día del mes, y cada valor es un objeto con tres propiedades: breakfast, lunch y dinner.
              
              Cada comida debe tener dos propiedades: "title" (nombre de la comida) y "ingredients" (lista de ingredientes separados por comas).
              
              Ejemplo del formato esperado:
              {
                "1": {
                  "breakfast": {
                    "title": "Tortilla de claras y espinacas",
                    "ingredients": "4 claras de huevo, 1 huevo entero, 1 taza de espinacas, 1 aguacate pequeño"
                  },
                  "lunch": {
                    "title": "Quinoa con pechuga de pollo",
                    "ingredients": "150g pechuga de pollo, 1 taza de quinoa, 1 taza de verduras al vapor"
                  },
                  "dinner": {
                    "title": "Pescado al horno con espárragos",
                    "ingredients": "200g de tilapia, 1 taza de espárragos, 1/2 taza de arroz integral"
                  }
                },
                "2": {
                  ... comidas para el día 2 ...
                }
              }
              
              IMPORTANTE: Lee cuidadosamente el plan de comidas para identificar si especifica días de la semana (Lunes, Martes, etc.) o categorías como "Días laborables" y "Fin de semana". Asigna las comidas EXACTAMENTE a los días correspondientes.
              
              IMPORTANTE: Proporciona solo el JSON en tu respuesta, sin etiquetas markdown como \`\`\`json o \`\`\`, sin comentarios ni texto adicional.`
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
      
      // Guardar el plan formateado en Firebase
      const calendarId = `${currentYear}-${currentMonth + 1}`;
      const calendarDocRef = doc(db, 'users', currentUser.uid, 'calendars', calendarId);
      
      // Verificar si ya existen comidas para este mes
      const calendarDoc = await getDoc(calendarDocRef);
      let existingMeals = {};
      
      if (calendarDoc.exists()) {
        existingMeals = calendarDoc.data();
      }
      
      // Filtrar solo los días que pertenecen a las semanas seleccionadas
      const filteredMealPlan = {};
      
      // Recorrer todos los días del mes
      Object.keys(formattedMealPlan).forEach(day => {
        // Convertir el día a objeto Date
        const date = new Date(currentYear, currentMonth, parseInt(day));
        // Obtener la semana del mes
        const weekOfMonth = getWeekOfMonth(date);
        
        // Solo incluir este día si su semana está seleccionada
        if (selectedWeeks.includes(weekOfMonth)) {
          filteredMealPlan[day] = formattedMealPlan[day];
        }
      });
      
      // Combinar las comidas existentes con las nuevas
      const combinedMeals = { ...existingMeals, ...filteredMealPlan };
      
      // Guardar en Firebase
      await setDoc(calendarDocRef, combinedMeals);
      
      // Actualizar el estado local
      setMeals(combinedMeals);
      
      // Recargar las comidas del mes actual para mostrar los cambios
      loadMeals(currentDate.getFullYear(), currentDate.getMonth() + 1);
      
      alert('¡Plan de comidas añadido al calendario con éxito!');
      
    } catch (error) {
      console.error('Error al procesar el plan de comidas:', error);
      alert('Error al procesar el plan de comidas. Por favor, inténtalo de nuevo.');
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

  return (
    <div className="meal-planner">
      <h1>Planificador de Comidas</h1>
      
      <div className="ai-import-section">
        <button 
          className="ai-import-button" 
          onClick={processMealPlanWithAI}
          disabled={isProcessingAI || !savedMealPlan}
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
          {[1, 2, 3, 4, 5, 6].map(week => (
            <label key={week} className="week-checkbox-label">
              <input
                type="checkbox"
                checked={selectedWeeks.includes(week)}
                onChange={() => handleWeekSelection(week)}
              />
              Semana {week}
            </label>
          ))}
        </div>
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
                            <span className="meal-icon">🍳</span>
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
                            <span className="meal-icon">🍲</span>
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
                            <span className="meal-icon">🍽️</span>
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
              <div className="form-actions">
                <button className="save-button" onClick={saveMeal}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlanner; 