import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';

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

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const queryParams = new URLSearchParams({
          month: filter.month,
          year: filter.year
        }).toString();

        const response = await fetch(`/api/expenses?${queryParams}`, {
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loading}>Carregando...</p>
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
      <div className={styles.header}>
        <h1>Minhas Despesas</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Mês</label>
          <select
            name="month"
            value={filter.month}
            onChange={handleFilterChange}
            className={styles.select}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Ano</label>
          <select
            name="year"
            value={filter.year}
            onChange={handleFilterChange}
            className={styles.select}
          >
            {years.map(year => (
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
                <th>Subcategoria</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Parcelas</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>{expense.description}</td>
                  <td>{expense.Category?.category_name}</td>
                  <td>{expense.SubCategory?.subcategory_name}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>
                    {expense.payment_method === 'card' ? '💳 Cartão' : '📱 Pix'}
                  </td>
                  <td>
                    {expense.has_installments 
                      ? `${expense.current_installment}/${expense.total_installments}`
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.noData}>
          <p>Nenhuma despesa encontrada para o período selecionado.</p>
        </div>
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
  );
};

export default Expenses;
