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
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setExpenses(data.expenses);
        setTotalExpenses(data.totalExpenses);
        setExpensesByCategory(data.expensesByCategory);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  const chartData = {
    labels: Object.keys(expensesByCategory),
    datasets: [
      {
        data: Object.values(expensesByCategory),
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

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Dashboard</h1>
        
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.subtitle}>Total de Gastos</h2>
            <p className={styles.amount}>
              R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.subtitle}>Gastos por Categoria</h2>
            <div className={styles.chartContainer}>
              <Pie data={chartData} options={{ responsive: true }} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.subtitle}>Últimas Despesas</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 5).map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.description}</td>
                    <td>{expense.category_name}</td>
                    <td>
                      R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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