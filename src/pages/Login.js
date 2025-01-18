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
          // Si el usuario no existe, guárdalo en Firestore
          await setDoc(userDocRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            // Otros datos que quieras almacenar
          });
          // Redirige a completar perfil
          navigate('/complete-profile');
          console.log('Usuario guardado en Firestore');
        } else {
          // Usuario ya existe, redirige al Dashboard
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
      <h2>Iniciar Sesión</h2>
      <button onClick={handleGoogleSignIn}>Iniciar sesión con Google</button>
    </div>
  );
}

export default Login;
