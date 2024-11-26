import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';

function History() {
  const { currentUser } = useContext(AuthContext);
  const [weightData, setWeightData] = useState([]);

  useEffect(() => {
    const fetchWeightData = async () => {
      if (!currentUser) {
        console.error('Usuario no autenticado');
        return;
      }
      const weightQuery = query(collection(db, 'users', currentUser.uid, 'measurements'));
      const querySnapshot = await getDocs(weightQuery);
      const weights = querySnapshot.docs.map(doc => ({
        date: doc.data().timestamp.toDate(),
        weight: doc.data().weight
      }));
      setWeightData(weights);
    };

    if (currentUser) {
      fetchWeightData();
    }
  }, [currentUser]);

  const weightChartData = {
    labels: weightData.map(entry => entry.date.toLocaleDateString()),
    datasets: [
      {
        label: 'Peso',
        data: weightData.map(entry => entry.weight),
        fill: false,
        backgroundColor: 'blue',
        borderColor: 'blue'
      }
    ]
  };

  return (
    <div>
      <h2>Historial de Peso</h2>
      {weightData.length > 0 ? (
        <Line data={weightChartData} />
      ) : (
        <p>No hay datos de peso disponibles.</p>
      )}
    </div>
  );
}

export default History;