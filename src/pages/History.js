import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function History() {
  const { currentUser } = useContext(AuthContext);
  const [weightData, setWeightData] = useState([]);
  const [heightData, setHeightData] = useState([]);

  useEffect(() => {
    const fetchWeightData = async () => {
      if (!currentUser) {
        console.error('Usuario no autenticado');
        return;
      }
      const weightQuery = query(collection(db, 'users', currentUser.uid, 'measurements'));
      const querySnapshot = await getDocs(weightQuery);
      const weights = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            date: data.timestamp.toDate(),
            weight: data.weight ? parseFloat(data.weight) : null,
            height: data.height ? parseFloat(data.height) : null
          };
        })
        .filter(entry => entry.weight || entry.height); // Filtrar entradas sin peso o altura válidos

      // Ordenar los datos por fecha ascendente
      weights.sort((a, b) => a.date - b.date);

      setWeightData(weights);

      const validHeights = weights.filter(entry => entry.height);
      validHeights.sort((a, b) => a.date - b.date);
      setHeightData(validHeights);
    };

    fetchWeightData();
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

  const heightChartData = {
    labels: heightData.map(entry => entry.date.toLocaleDateString()),
    datasets: [
      {
        label: 'Altura',
        data: heightData.map(entry => entry.height),
        fill: false,
        backgroundColor: 'green',
        borderColor: 'green'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  return (
    <div>
      <h2>Historial de Peso</h2>
      {weightData.length > 0 ? (
        <div className="chart-container">
          <Line options={chartOptions} data={weightChartData} />
        </div>
      ) : (
        <p>No hay datos de peso disponibles.</p>
      )}
      <h2>Historial de Altura</h2>
      {heightData.length > 0 ? (
        <div className="chart-container">
          <Line options={chartOptions} data={heightChartData} />
        </div>
      ) : (
        <p>No hay datos de altura disponibles.</p>
      )}
    </div>
  );
}

export default History;