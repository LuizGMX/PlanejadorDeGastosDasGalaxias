import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const Expenses = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch(`/api/expenses?month=${filter.month}&year=${filter.year}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar despesas');
        }

        const data = await response.json();
        setExpenses(data);
      } catch (err) {
        setError('Erro ao carregar despesas. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [auth.token, filter]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
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
        <h1 className={styles.title}>Minhas Despesas</h1>

        <div className={styles.filters}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Mês</label>
            <select
              name="month"
              value={filter.month}
              onChange={handleFilterChange}
              className={styles.input}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Ano</label>
            <select
              name="year"
              value={filter.year}
              onChange={handleFilterChange}
              className={styles.input}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {expenses.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                    <td>{expense.description}</td>
                    <td>{expense.category_name}</td>
                    <td>R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>{expense.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.noData}>Nenhuma despesa encontrada para o período selecionado.</p>
        )}

        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={() => navigate('/add-expense')}
          >
            Adicionar Despesa
          </button>
          <button
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => navigate('/dashboard')}
          >
            Voltar para Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
