import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import styles from './Dashboard.module.css';

// Registra os elementos necessários
ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
  const [chartData, setChartData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Buscando dados do dashboard...');
        const res = await axios.get('/api/dashboard', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        console.log('Resposta do backend:', res.data); // Loga a resposta completa
        const expensesByCategory = res.data.expenses_by_category;

        // Verifica se expensesByCategory é válido
        if (!expensesByCategory || expensesByCategory.length === 0) {
          console.log('Nenhuma despesa encontrada, redirecionando para /add-expense');
          navigate('/add-expense');
          return;
        }

        const data = {
          labels: expensesByCategory.map((item) => item.category_name),
          datasets: [
            {
              label: 'Despesas por Categoria',
              data: expensesByCategory.map((item) => item.total),
              backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0',
                '#9966FF',
              ],
              hoverOffset: 4,
            },
          ],
        };
        console.log('Dados do gráfico preparados:', data);
        setChartData(data);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error.response?.data || error.message);
      }
    };
    fetchData();
  }, [navigate]);

  return (
    <div className={styles.container}>
      <h2>Dashboard</h2>
      {chartData ? (
        <div className={styles.chart}>
          <Pie data={chartData} />
        </div>
      ) : (
        <p>Carregando dados...</p>
      )}
    </div>
  );
}

export default Dashboard;