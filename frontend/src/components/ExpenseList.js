import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import LogoutButton from './LogoutButton';

const ExpenseList = () => {
  const { auth } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    category_id: ''
  });
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca categorias
        const categoriesResponse = await fetch('/api/expenses/categories', {
          headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        if (!categoriesResponse.ok) throw new Error('Erro ao carregar categorias');
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Busca despesas com filtros
        const queryParams = new URLSearchParams(filters).toString();
        const expensesResponse = await fetch(`/api/expenses?${queryParams}`, {
          headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        if (!expensesResponse.ok) throw new Error('Erro ao carregar despesas');
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectExpense = (expenseId) => {
    setSelectedExpenses(prev => {
      if (prev.includes(expenseId)) {
        return prev.filter(id => id !== expenseId);
      } else {
        return [...prev, expenseId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenses.map(expense => expense.id));
    }
  };

  const handleDelete = async (ids) => {
    if (!window.confirm('Tem certeza que deseja excluir as despesas selecionadas?')) {
      return;
    }

    try {
      const response = await fetch('/api/expenses/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ ids })
      });

      if (!response.ok) throw new Error('Erro ao excluir despesas');

      // Atualiza a lista de despesas
      setExpenses(prev => prev.filter(expense => !ids.includes(expense.id)));
      setSelectedExpenses([]);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <LogoutButton />
      
      <div className={styles.filters}>
        <select
          name="month"
          value={filters.month}
          onChange={handleFilterChange}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <option key={month} value={month}>
              {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
            </option>
          ))}
        </select>

        <select
          name="year"
          value={filters.year}
          onChange={handleFilterChange}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select
          name="category_id"
          value={filters.category_id}
          onChange={handleFilterChange}
        >
          <option value="">Todas as categorias</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.category_name}
            </option>
          ))}
        </select>
      </div>

      {selectedExpenses.length > 0 && (
        <div className={styles.bulkActions}>
          <button
            onClick={() => handleDelete(selectedExpenses)}
            className={styles.deleteButton}
          >
            Excluir Selecionados ({selectedExpenses.length})
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedExpenses.length === expenses.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Valor</th>
              <th>Método</th>
              <th>Parcela</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedExpenses.includes(expense.id)}
                    onChange={() => handleSelectExpense(expense.id)}
                  />
                </td>
                <td>{new Date(expense.expense_date).toLocaleDateString('pt-BR')}</td>
                <td>{expense.description}</td>
                <td>{expense.Category.category_name}</td>
                <td>{expense.SubCategory.subcategory_name}</td>
                <td>R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>{expense.payment_method === 'card' ? '💳 Cartão' : '📱 Pix'}</td>
                <td>
                  {expense.has_installments 
                    ? `${expense.current_installment}/${expense.total_installments}`
                    : '-'
                  }
                </td>
                <td>
                  <button
                    onClick={() => handleDelete([expense.id])}
                    className={styles.deleteButton}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseList; 