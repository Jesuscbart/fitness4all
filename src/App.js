import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import FoodLog from './pages/FoodLog';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import CompleteProfile from './pages/CompleteProfile';
import ExerciseLog from './pages/ExerciseLog';
import History from './pages/History';
import MealPlanner from './pages/MealPlanner';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend } from 'chart.js';

// Configuración del chart (se utiliza en los gráficos de la aplicación)
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Rutas de acceso público */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/complete-profile" element={
              <PrivateRoute>
                <CompleteProfile />
              </PrivateRoute>
            }
          />
          {/* Rutas protegidas para usuarios autenticados */}
          <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/food-log" element={
              <PrivateRoute>
                <FoodLog />
              </PrivateRoute>
            }
          />
          <Route path="/exercise-log" element={
              <PrivateRoute>
                <ExerciseLog />
              </PrivateRoute>
            }
          />
          <Route path="/history" element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
          <Route path="/meal-planner" element={
              <PrivateRoute>
                <MealPlanner />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
