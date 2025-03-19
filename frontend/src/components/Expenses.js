import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditExpenseForm from './EditExpenseForm';

const Expenses = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category: 'all',
    paymentMethod: 'all',
    hasInstallments: 'all',
    description: '',
    is_recurring: ''
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });
  const [deleteOption, setDeleteOption] = useState(null);
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);

  const years = Array.from(
    { length: 11 },
    (_, i) => ({
      value: 2025 + i,
      label: (2025 + i).toString()
    })
  );

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

  const paymentMethods = [
    { value: 'all', label: 'Todos os Métodos' },
    { value: 'card', label: 'Cartão' },
    { value: 'pix', label: 'PIX' }
  ];

  const installmentOptions = [
    { value: 'all', label: 'Todas as Despesas' },
    { value: 'yes', label: 'Apenas Parceladas' },
    { value: 'no', label: 'Apenas Não Parceladas' }
  ];

  const [categories, setCategories] = useState([
    { value: 'all', label: 'Todas as Categorias' }
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/categories`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar categorias');
        }

        const data = await response.json();
        setCategories(data.map(category => ({
          value: category.id,
          label: category.category_name
        })));
      } catch (err) {
        setError('Erro ao carregar categorias. Por favor, tente novamente.');
      }
    };

    fetchCategories();
  }, [auth.token]);

  useEffect(() => {
    fetchExpenses();
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

  const handleFilterClick = (filterType) => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
  };

  const handleFilterChange = (type, value) => {
    if (type === 'months' || type === 'years') {
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
    } else {
      setFilters(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  const fetchExpenses = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // Adiciona meses e anos como arrays
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      // Adiciona outros filtros
      if (filters.category !== 'all') {
        queryParams.append('category_id', filters.category);
      }
      if (filters.paymentMethod !== 'all') {
        queryParams.append('payment_method', filters.paymentMethod);
      }
      if (filters.hasInstallments !== 'all') {
        queryParams.append('has_installments', filters.hasInstallments === 'yes');
      }
      if (filters.description) {
        queryParams.append('description', filters.description);
      }
      if (filters.is_recurring !== '') {
        queryParams.append('is_recurring', filters.is_recurring);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (response.status === 401) {
          navigate('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Erro ao carregar despesas');
        }

        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
        setSelectedExpenses([]);

        // Define a mensagem quando não há despesas
        if (!data || !Array.isArray(data) || data.length === 0) {
          // Verifica se há filtros ativos
          const hasActiveFilters = filters.months.length !== 1 || 
                                 filters.years.length !== 1 || 
                                 filters.category !== 'all' || 
                                 filters.paymentMethod !== 'all' || 
                                 filters.hasInstallments !== 'all' || 
                                 filters.description !== '' || 
                                 filters.is_recurring !== '';

          setNoExpensesMessage(hasActiveFilters ? {
            message: 'Nenhuma despesa encontrada para os filtros selecionados.',
            suggestion: 'Tente ajustar os filtros para ver mais resultados.'
          } : {
            message: 'Você ainda não tem despesas cadastradas para este período.',
            suggestion: 'Que tal começar adicionando sua primeira despesa?'
          });
        } else {
          setNoExpensesMessage(null);
        }
      } catch (err) {
        setError('Erro ao carregar despesas');
      } finally {
        setLoading(false);
      }
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const nonInstallmentExpenses = expenses
        .filter(expense => !expense.has_installments)
        .map(expense => expense.id);
      setSelectedExpenses(nonInstallmentExpenses);
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleSelectExpense = (id, event) => {
    const expense = expenses.find(e => e.id === id);
    if (expense?.has_installments) {
      const rect = event.target.getBoundingClientRect();
      setMessagePosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 5
      });
      setShowInstallmentMessage(true);
      setTimeout(() => setShowInstallmentMessage(false), 3000);
      return;
    }

    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expenseId => expenseId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteClick = (expense = null) => {
    if (expense) {
      setExpenseToDelete(expense);
      if (expense.is_recurring) {
        setDeleteOptions({
          type: 'recurring',
          delete_future: false
        });
      } else if (expense.has_installments) {
        setDeleteOptions({
          type: 'installment',
          installmentGroupId: expense.installment_group_id
        });
      } else {
        setDeleteOptions({
          type: 'single'
        });
      }
    } else {
      // Deleção em massa
      setExpenseToDelete(null);
      setDeleteOptions({
        type: 'bulk',
        ids: selectedExpenses
      });
    }
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteOptions.type === 'bulk') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/bulk`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: deleteOptions.ids })
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir despesas');
        }

        const data = await response.json();

        // Limpa os estados do modal
        setShowDeleteModal(false);
        setExpenseToDelete(null);
        setDeleteOptions({ type: 'single' });
        setSelectedExpenses([]);

        // Mostra mensagem de sucesso
        setDeleteSuccess({
          message: data.message,
          count: data.count
        });

        // Remove a mensagem após 3 segundos
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);

        // Recarrega a lista de despesas
        await fetchExpenses();
        return;
      }

      let url = `${process.env.REACT_APP_API_URL}/api/expenses/${expenseToDelete.id}`;
      const queryParams = new URLSearchParams();

      if (deleteOptions.type === 'recurring') {
        switch (deleteOption) {
          case 'future':
            queryParams.append('delete_future', 'true');
            break;
          case 'past':
            queryParams.append('delete_past', 'true');
            break;
          case 'all':
            queryParams.append('delete_all', 'true');
            break;
        }
      } else if (deleteOptions.type === 'installment' && deleteOption === 'all') {
        queryParams.append('delete_all_installments', 'true');
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir despesa');
      }

      const data = await response.json();

      // Limpa os estados do modal
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setDeleteOptions({ type: 'single' });
      setDeleteOption(null);

      // Mostra mensagem de sucesso
      setDeleteSuccess({
        message: data.message,
        count: data.count || 1
      });

      // Remove a mensagem após 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      // Recarrega a lista de despesas
      await fetchExpenses();
    } catch (err) {
      setError('Erro ao excluir despesa. Por favor, tente novamente.');
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
  };

  const handleUpdate = async (updatedExpense) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${updatedExpense.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedExpense)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar despesa');
      }

      setEditingExpense(null);
      await fetchExpenses();
    } catch (err) {
      setError('Erro ao atualizar despesa. Por favor, tente novamente.');
    }
  };

  const formatSelectedPeriod = (filterType) => {
    switch (filterType) {
      case 'category':
        if (!filters.category) return 'Todas as categorias';
        const selectedCategory = categories.find(c => c.value === filters.category);
        return selectedCategory ? selectedCategory.label : 'Todas as categorias';
      case 'months':
        if (filters.months.length === 0) return 'Selecione os meses';
        if (filters.months.length === months.length) return 'Todos os meses';
        if (filters.months.length === 1) {
          return months.find(m => m.value === filters.months[0])?.label;
        }
        if (filters.months.length > 3) {
          return `${filters.months.length} meses selecionados`;
        }
        return filters.months
          .map(m => months.find(month => month.value === m)?.label)
          .join(', ');
      case 'years':
        if (filters.years.length === 0) return 'Selecione os anos';
        if (filters.years.length === years.length) return 'Todos os anos';
        if (filters.years.length === 1) {
          return filters.years[0].toString();
        }
        if (filters.years.length > 3) {
          return `${filters.years.length} anos selecionados`;
        }
        return filters.years.join(', ');
      case 'paymentMethod':
        const selectedMethod = paymentMethods.find(m => m.value === filters.paymentMethod);
        return selectedMethod ? selectedMethod.label : 'Método de Pagamento';
      case 'hasInstallments':
        const selectedOption = installmentOptions.find(o => o.value === filters.hasInstallments);
        return selectedOption ? selectedOption.label : 'Tipo de Despesa';
      case 'description':
        return filters.description;
      default:
        return 'Selecione um filtro';
    }
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
        <h1 className={styles.title}>Minhas Despesas</h1>
        <button
          className={styles.addButton}
          onClick={() => navigate('/add-expense')}
        >
          {/* <span className="material-icons">add</span> */}
          Adicionar Despesa
        </button>
      </div>

      {deleteSuccess && (
        <div className={sharedStyles.successMessage}>
          {deleteSuccess.message} {deleteSuccess.count > 1 ? `(${deleteSuccess.count} itens)` : ''}
        </div>
      )}

      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <div 
              className={`${styles.modernSelect} ${openFilter === 'months' ? styles.active : ''}`}
              onClick={() => handleFilterClick('months')}
            >
              <div className={styles.modernSelectHeader}>
                <span>Mês: {formatSelectedPeriod('months')}</span>
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
                <span>{formatSelectedPeriod('years').length>4  ? 'Anos: ' : 'Ano: '} {formatSelectedPeriod('years')}</span>
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
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <div 
              className={`${styles.modernSelect} ${openFilter === 'category' ? styles.active : ''}`}
              onClick={() => handleFilterClick('category')}
            >
              <div className={styles.modernSelectHeader}>
                <span>{formatSelectedPeriod('category')}</span>
                <span className={`material-icons ${styles.arrow}`}>
                  {openFilter === 'category' ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              {openFilter === 'category' && (
                <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                  <label 
                    key="all-categories" 
                    className={styles.modernCheckboxLabel}
                    onClick={handleCheckboxClick}
                  >
                    <div className={styles.modernCheckbox}>
                      <input
                        type="radio"
                        checked={!filters.category || filters.category === ''}
                        onChange={() => handleFilterChange('category', '')}
                        className={styles.hiddenCheckbox}
                      />
                      <div className={styles.customCheckbox}>
                        <span className="material-icons">check</span>
                      </div>
                    </div>
                    <span><strong>Todas as categorias</strong></span>
                  </label>
                  <div className={styles.divider}></div>
                  {categories.map(category => (
                    <label 
                      key={category.value} 
                      className={styles.modernCheckboxLabel}
                      onClick={handleCheckboxClick}
                    >
                      <div className={styles.modernCheckbox}>
                        <input
                          type="radio"
                          checked={filters.category === category.value}
                          onChange={() => handleFilterChange('category', category.value)}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.customCheckbox}>
                          <span className="material-icons">check</span>
                        </div>
                      </div>
                      <span>{category.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div 
              className={`${styles.modernSelect} ${openFilter === 'paymentMethod' ? styles.active : ''}`}
              onClick={() => handleFilterClick('paymentMethod')}
            >
              <div className={styles.modernSelectHeader}>
                <span>{formatSelectedPeriod('paymentMethod')}</span>
                <span className={`material-icons ${styles.arrow}`}>
                  {openFilter === 'paymentMethod' ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              {openFilter === 'paymentMethod' && (
                <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                  {paymentMethods.map(method => (
                    <label 
                      key={method.value} 
                      className={styles.modernCheckboxLabel}
                      onClick={handleCheckboxClick}
                    >
                      <div className={styles.modernCheckbox}>
                        <input
                          type="radio"
                          checked={filters.paymentMethod === method.value}
                          onChange={() => handleFilterChange('paymentMethod', method.value)}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.customCheckbox}>
                          <span className="material-icons">check</span>
                        </div>
                      </div>
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>


        <div className={styles.searchRow}>
          <div className={styles.searchField}>
            <span className="material-icons">search</span>
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={filters.description}
              onChange={(e) => handleFilterChange('description', e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button
            className={`${styles.recurringButton} ${filters.is_recurring === 'true' ? styles.active : ''}`}
            onClick={() => handleFilterChange('is_recurring', filters.is_recurring === 'true' ? '' : 'true')}
            title="Mostrar apenas despesas recorrentes"
          >
            <span className="material-icons">sync</span>
            Recorrentes
          </button>
        </div>
     
     
      </div>

      {selectedExpenses.length > 0 && (
        <div className={styles.bulkActions}>
          <button
            className={styles.deleteButton}
            onClick={() => handleDeleteClick()}
          >
            Excluir {selectedExpenses.length} {selectedExpenses.length === 1 ? 'item selecionado' : 'itens selecionados'}
          </button>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className={styles.noExpensesContainer}>
          <h2>{noExpensesMessage?.message || 'Nenhuma despesa encontrada para os filtros selecionados.'}</h2>
          {noExpensesMessage?.suggestion && <p>{noExpensesMessage.suggestion}</p>}
          <div className={styles.buttonGroup}>
            <button
              className={styles.addFirstExpenseButton}
              onClick={() => navigate('/add-expense')}
            >
              Adicionar Primeira Despesa
            </button>
            <button
              className={styles.backButton}
              onClick={() => {
                setFilters({
                  months: [new Date().getMonth() + 1],
                  years: [new Date().getFullYear()],
                  category: 'all',
                  paymentMethod: 'all',
                  hasInstallments: 'all',
                  description: '',
                  is_recurring: ''
                });
              }}
            >
              Voltar para Mês Atual
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.totalExpenses}>
            <h3>Total de despesas para os filtros selecionados: {formatCurrency(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0))}</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === expenses.filter(e => !e.has_installments).length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Subcategoria</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Parcelas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className={selectedExpenses.includes(expense.id) ? styles.selected : ''}>
                    <td data-label="Selecionar">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={(e) => handleSelectExpense(expense.id, e)}
                        className={expense.has_installments ? styles.installmentCheckbox : ''}
                      />
                    </td>
                    <td data-label="Data">{formatDate(expense.expense_date)}</td>
                    <td data-label="Descrição">{expense.description}</td>
                    <td data-label="Categoria">{expense.Category?.category_name}</td>
                    <td data-label="Subcategoria">{expense.SubCategory?.subcategory_name}</td>
                    <td data-label="Valor">{formatCurrency(expense.amount)}</td>
                    <td data-label="Método">
                      {expense.payment_method === 'card' ? (
                        <span className="material-icons">credit_card</span>
                      ) : (
                        <span className="material-icons">pix</span>
                      )}
                      {expense.is_recurring && (
                        <span 
                          className="material-icons" 
                          title={`Despesa Recorrente - Início: ${formatDate(expense.start_date)} - Fim: ${formatDate(expense.end_date)}`}
                        >
                          sync
                        </span>
                      )}
                    </td>
                    <td data-label="Parcelas">
                      {expense.has_installments 
                        ? `${expense.current_installment}/${expense.total_installments}`
                        : '-'
                      }
                    </td>
                    <td data-label="Ações">
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => handleEditClick(expense)}
                          className={styles.editButton}
                          title="Editar"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(expense)}
                          className={styles.deleteButton}
                          title="Excluir"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Confirmar Exclusão</h2>
            {deleteOptions.type === 'recurring' ? (
              <>
                <p>Como você deseja excluir esta despesa recorrente?</p>
                <div className={styles.deleteOptions}>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-single"
                      checked={deleteOption === 'single'}
                      onChange={() => setDeleteOption('single')}
                    />
                    <label htmlFor="delete-single">Apenas esta</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-future"
                      checked={deleteOption === 'future'}
                      onChange={() => setDeleteOption('future')}
                    />
                    <label htmlFor="delete-future">Esta e futuras</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-past"
                      checked={deleteOption === 'past'}
                      onChange={() => setDeleteOption('past')}
                    />
                    <label htmlFor="delete-past">Esta e passadas</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-all"
                      checked={deleteOption === 'all'}
                      onChange={() => setDeleteOption('all')}
                    />
                    <label htmlFor="delete-all">Todas</label>
                  </div>
                </div>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setExpenseToDelete(null);
                      setDeleteOptions({ type: 'single' });
                      setDeleteOption(null);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      switch (deleteOption) {
                        case 'single':
                          setDeleteOptions(prev => ({ ...prev, delete_future: false, delete_past: false, delete_all: false }));
                          break;
                        case 'future':
                          setDeleteOptions(prev => ({ ...prev, delete_future: true, delete_past: false, delete_all: false }));
                          break;
                        case 'past':
                          setDeleteOptions(prev => ({ ...prev, delete_future: false, delete_past: true, delete_all: false }));
                          break;
                        case 'all':
                          setDeleteOptions(prev => ({ ...prev, delete_future: false, delete_past: false, delete_all: true }));
                          break;
                      }
                      handleDelete();
                    }}
                    className={styles.deleteButton}
                    disabled={!deleteOption}
                  >
                    Excluir
                  </button>
                </div>
              </>
            ) : deleteOptions.type === 'installment' ? (
              <>
                <p>Como você deseja excluir esta despesa parcelada?</p>
                <div className={styles.deleteOptions}>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-single-installment"
                      checked={deleteOption === 'single'}
                      onChange={() => setDeleteOption('single')}
                    />
                    <label htmlFor="delete-single-installment">Apenas esta parcela</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="checkbox"
                      id="delete-all-installments"
                      checked={deleteOption === 'all'}
                      onChange={() => setDeleteOption('all')}
                    />
                    <label htmlFor="delete-all-installments">Todas as parcelas</label>
                  </div>
                </div>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setExpenseToDelete(null);
                      setDeleteOptions({ type: 'single' });
                      setDeleteOption(null);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setDeleteOptions(prev => ({ 
                        ...prev, 
                        deleteAllInstallments: deleteOption === 'all' 
                      }));
                      handleDelete();
                    }}
                    className={styles.deleteButton}
                    disabled={!deleteOption}
                  >
                    Excluir
                  </button>
                </div>
              </>
            ) : deleteOptions.type === 'bulk' ? (
              <>
                <p>Tem certeza que deseja excluir {deleteOptions.ids.length} {deleteOptions.ids.length === 1 ? 'despesa' : 'despesas'}?</p>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setExpenseToDelete(null);
                      setDeleteOptions({ type: 'single' });
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      Promise.all(deleteOptions.ids.map(id => handleDelete(id)))
                        .then(() => {
                          setSelectedExpenses([]);
                        });
                    }}
                    className={styles.deleteButton}
                  >
                    Excluir
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Tem certeza que deseja excluir esta despesa?</p>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setExpenseToDelete(null);
                      setDeleteOptions({ type: 'single' });
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    className={styles.deleteButton}
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onSave={handleUpdate}
          onCancel={() => setEditingExpense(null)}
        />
      )}

      {showInstallmentMessage && (
        <div 
          className={styles.installmentMessage}
          style={{
            position: 'absolute',
            left: messagePosition.x,
            top: messagePosition.y
          }}
        >
          Para excluir despesas parceladas, use o botão
          <span className="material-icons" style={{ verticalAlign: 'middle', marginLeft: '4px' }}>delete_outline</span>
        </div>
      )}
    </div>
  );
};

export default Expenses;
