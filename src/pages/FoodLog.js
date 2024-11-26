import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext'; // Importar useAuth correctamente

function FoodLog() {
  const { currentUser } = useAuth(); // Obtener el usuario actual

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      console.error('Usuario no autenticado');
      return;
    }
    try {
      await addDoc(collection(db, 'foodLogs'), {
        userId: currentUser.uid, // Usar currentUser en lugar de auth.currentUser
        // Otros datos del formulario
      });
      // Mostrar mensaje de éxito
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="foodName">Nombre de la comida:</label>
        <input type="text" id="foodName" name="foodName" required />
      </div>
      <div>
        <label htmlFor="calories">Calorías:</label>
        <input type="number" id="calories" name="calories" required />
      </div>
      <button type="submit">Registrar</button>
    </form>
  );
}

export default FoodLog;
