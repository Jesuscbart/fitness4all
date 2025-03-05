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
  
  // Nombres de los meses en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Nombres de los días en español
  const dayNames = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  
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

  return (
    <div className="meal-planner">
      <h1>Planificador de Comidas</h1>
      
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