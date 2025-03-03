import React, { useState, useEffect } from 'react';
import './MealPlanner.css';

function MealPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meals, setMeals] = useState({}); // Almacena las comidas por día
  
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
  }, [currentDate]);
  
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
    setSelectedMeal({
      date,
      mealType,
      formattedDate: `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`
    });
    setIsModalOpen(true);
  };

  // Cierra el modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMeal(null);
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

  // Maneja el cambio de comidas
  const handleMealChange = (date, mealType, value) => {
    setMeals(prevMeals => ({
      ...prevMeals,
      [date]: {
        ...prevMeals[date],
        [mealType]: value
      }
    }));
  };

  return (
    <div className="meal-planner">
      <h1>Planificador de Comidas</h1>
      
      <div className="calendar-controls">
        <button onClick={goToPreviousMonth}>&laquo; Anterior</button>
        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={goToNextMonth}>Siguiente &raquo;</button>
      </div>
      
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
                        <span className="meal-icon">🍳</span>
                      </div>
                    </div>
                    <div className="meal-section" onClick={() => openMealModal(day, 'lunch')}>
                      <div className="meal-card">
                        <span className="meal-icon">🍲</span>
                      </div>
                    </div>
                    <div className="meal-section" onClick={() => openMealModal(day, 'dinner')}>
                      <div className="meal-card">
                        <span className="meal-icon">🍽️</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && selectedMeal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>×</button>
            <h3>{formatMealType(selectedMeal.mealType)} - {selectedMeal.formattedDate}</h3>
            <div className="meal-form">
              <div className="form-group">
                <label>Título:</label>
                <input type="text" placeholder="Ej: Ensalada mediterránea" />
              </div>
              <div className="form-group">
                <label>Ingredientes:</label>
                <textarea placeholder="Ej: 200g de lechuga, 100g de tomate..."></textarea>
              </div>
              <div className="form-group">
                <label>Notas adicionales:</label>
                <textarea placeholder="Ej: Preparar la noche anterior..."></textarea>
              </div>
              <div className="form-actions">
                <button className="save-button">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlanner; 