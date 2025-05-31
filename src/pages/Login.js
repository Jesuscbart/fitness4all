// src/pages/Login.js
import { auth, db } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;

        // Verifica si el usuario ya existe en Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Si el usuario no existe, se guarda en Firestore
          await setDoc(userDocRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          });
          // Si es un nuevo usuario, dirigir a completar el perfil
          navigate('/complete-profile');
          console.log('Usuario guardado en Firestore');
        } else {
          // Si el usuario ya existe, dirigir al Dashboard
          navigate('/');
          console.log('Usuario ya existe en Firestore');
        }
      })
      .catch((error) => {
        console.error('Error en la autenticación:', error);
      });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="app-logo">
          <h1>FITNESS4ALL</h1>
        </div>
        
        <h2>Iniciar Sesión</h2>
        <p className="login-subtitle">
          Accede a tu entrenador personal con IA y comienza tu transformación
        </p>
        
        <button className="google-signin-btn" onClick={handleGoogleSignIn}>
          Iniciar sesión con Google
        </button>
        
        <div className="features-list">
          <h4>¿Qué encontrarás en Fitness4All?</h4>
          <ul>
            <li>Planes de entrenamiento personalizados</li>
            <li>Menús nutricionales adaptados a ti</li>
            <li>Seguimiento de tu progreso</li>
            <li>Listas de compra inteligentes</li>
            <li>Recomendaciones con IA avanzada</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;
