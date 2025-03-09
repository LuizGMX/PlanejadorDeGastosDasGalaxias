import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [currentFilters, setCurrentFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dados do dashboard');
        }

        const data = await response.json();
        
        if (data.message) {
          setMessage(data.message);
        }

        setExpensesByCategory(data.expenses_by_category || []);
        setTotalExpenses(data.total_expenses || 0);
        setCurrentFilters(data.current_filters || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  const chartData = {
    labels: expensesByCategory.map(cat => cat.category_name),
    datasets: [
      {
        data: expensesByCategory.map(cat => cat.total),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0'
        ]
      }
    ]
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.text}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.message}>{message}</p>
          <button
            className={styles.button}
            onClick={() => navigate('/add-expense')}
          >
            Adicionar Despesa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Dashboard</h1>
        
        {currentFilters && (
          <div className={styles.filters}>
            <p>
              Mostrando despesas de {currentFilters.month}/{currentFilters.year}
              {currentFilters.payment_method !== 'all' && 
                ` - Pagamento: ${currentFilters.payment_method}`
              }
            </p>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.subtitle}>Total de Gastos</h2>
            <p className={styles.amount}>
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {expensesByCategory.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.subtitle}>Gastos por Categoria</h2>
              <div className={styles.chartContainer}>
                <Pie data={chartData} options={{ responsive: true }} />
              </div>
            </div>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={() => navigate('/add-expense')}
          >
            Adicionar Despesa
          </button>
          <button
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => navigate('/expenses')}
          >
            Ver Todas as Despesas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;