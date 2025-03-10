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
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category_id: '',
    description: ''
  });
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);

  // Lista de anos para o filtro
  const years = Array.from(
    { length: 5 },
    (_, i) => ({
      value: new Date().getFullYear() - i,
      label: (new Date().getFullYear() - i).toString()
    })
  );

  // Lista de meses para o filtro
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
        const queryParams = new URLSearchParams();
        filters.months.forEach(month => queryParams.append('months[]', month));
        filters.years.forEach(year => queryParams.append('years[]', year));
        if (filters.category_id) queryParams.append('category_id', filters.category_id);
        if (filters.description) queryParams.append('description', filters.description);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll(`.${styles.modernSelect}`);
      let clickedOutside = true;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFilterChange = (type, value) => {
    if (type === 'description') {
      setFilters(prev => ({ ...prev, description: value }));
      return;
    }

    if (type === 'category_id') {
      setFilters(prev => ({ ...prev, category_id: value }));
      return;
    }

    if (value === 'all') {
      setFilters(prev => ({
        ...prev,
        [type]: prev[type].length === (type === 'months' ? months.length : years.length) 
          ? [] 
          : type === 'months' 
            ? months.map(m => m.value) 
            : years.map(y => y.value)
      }));
    } else {
      setFilters(prev => {
        const newValues = prev[type].includes(value)
          ? prev[type].filter(item => item !== value)
          : [...prev[type], value];

        const totalItems = type === 'months' ? months.length : years.length;
        if (newValues.length === totalItems - 1) {
          return {
            ...prev,
            [type]: type === 'months' 
              ? months.map(m => m.value)
              : years.map(y => y.value)
          };
        }

        return {
          ...prev,
          [type]: newValues
        };
      });
    }
  };

  const handleFilterClick = (filterType) => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
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
      
      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <div 
            className={`${styles.modernSelect} ${openFilter === 'months' ? styles.active : ''}`}
            onClick={() => handleFilterClick('months')}
          >
            <div className={styles.modernSelectHeader}>
              <span>Meses Selecionados ({filters.months.length})</span>
              <span className={`material-icons ${styles.arrow}`}>
                {openFilter === 'months' ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            {openFilter === 'months' && (
              <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                <label 
                  key="all-months"
                  className={styles.modernCheckboxLabel}
                  onClick={handleCheckboxClick}
                >
                  <div className={styles.modernCheckbox}>
                    <input
                      type="checkbox"
                      checked={filters.months.length === months.length}
                      onChange={() => handleFilterChange('months', 'all')}
                      className={styles.hiddenCheckbox}
                    />
                    <div className={styles.customCheckbox}>
                      <span className="material-icons">check</span>
                    </div>
                  </div>
                  <span><strong>Todos os Meses</strong></span>
                </label>
                <div className={styles.divider}></div>
                {months.map(month => (
                  <label 
                    key={month.value} 
                    className={styles.modernCheckboxLabel}
                    onClick={handleCheckboxClick}
                  >
                    <div className={styles.modernCheckbox}>
                      <input
                        type="checkbox"
                        checked={filters.months.includes(month.value)}
                        onChange={() => handleFilterChange('months', month.value)}
                        className={styles.hiddenCheckbox}
                      />
                      <div className={styles.customCheckbox}>
                        <span className="material-icons">check</span>
                      </div>
                    </div>
                    <span>{month.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div 
            className={`${styles.modernSelect} ${openFilter === 'years' ? styles.active : ''}`}
            onClick={() => handleFilterClick('years')}
          >
            <div className={styles.modernSelectHeader}>
              <span>Anos Selecionados ({filters.years.length})</span>
              <span className={`material-icons ${styles.arrow}`}>
                {openFilter === 'years' ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            {openFilter === 'years' && (
              <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                <label 
                  key="all-years"
                  className={styles.modernCheckboxLabel}
                  onClick={handleCheckboxClick}
                >
                  <div className={styles.modernCheckbox}>
                    <input
                      type="checkbox"
                      checked={filters.years.length === years.length}
                      onChange={() => handleFilterChange('years', 'all')}
                      className={styles.hiddenCheckbox}
                    />
                    <div className={styles.customCheckbox}>
                      <span className="material-icons">check</span>
                    </div>
                  </div>
                  <span><strong>Todos os Anos</strong></span>
                </label>
                <div className={styles.divider}></div>
                {years.map(year => (
                  <label 
                    key={year.value} 
                    className={styles.modernCheckboxLabel}
                    onClick={handleCheckboxClick}
                  >
                    <div className={styles.modernCheckbox}>
                      <input
                        type="checkbox"
                        checked={filters.years.includes(year.value)}
                        onChange={() => handleFilterChange('years', year.value)}
                        className={styles.hiddenCheckbox}
                      />
                      <div className={styles.customCheckbox}>
                        <span className="material-icons">check</span>
                      </div>
                    </div>
                    <span>{year.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <select
            className={styles.modernSelect}
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por descrição..."
            value={filters.description}
            onChange={(e) => handleFilterChange('description', e.target.value)}
          />
        </div>
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