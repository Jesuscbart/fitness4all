import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        // Guarda el usuario en Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: '',
          email: user.email
        });
        // Navega a la página para completar el perfil
        navigate('/complete-profile');
        console.log('Usuario registrado:', user);
      })
      .catch((error) => {
        console.error('Error en el registro:', error);
      });
  };

  return (
    <form onSubmit={handleSignUp}>
      <h2>Registrarse</h2>
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Registrarse</button>
    </form>
  );
}

export default SignUp;
