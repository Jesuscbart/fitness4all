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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/complete-profile" element={
              <PrivateRoute>
                <CompleteProfile />
              </PrivateRoute>
            }
          />
          {/* Rutas protegidas */}
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
          {/* Otras rutas protegidas */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
