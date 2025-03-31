import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditExpenseForm from './EditExpenseForm';
import { toast } from 'react-hot-toast';

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
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);

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
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'money', label: 'Dinheiro' }
  ];

  const installmentOptions = [
    { value: 'all', label: 'Todas as Despesas' },
    { value: 'yes', label: 'Apenas Parceladas' },
    { value: 'no', label: 'Apenas Não Parceladas' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/categories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          })
        ]);

        if (!categoriesResponse.ok || !banksResponse.ok) {
          throw new Error('Erro ao carregar dados');
        }

        const [categoriesData, banksData] = await Promise.all([
          categoriesResponse.json(),
          banksResponse.json()
        ]);

        setCategories(categoriesData);
        setBanks(banksData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchData();
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

        return {
          ...prev,
          [type]: newValues
        };
      });
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
          showModal: true,
          options: [
            { id: 'all', label: 'Excluir todos os gastos fixos (passados e futuros)' },
            { id: 'past', label: 'Excluir somente gastos fixos passados' },
            { id: 'future', label: 'Excluir somente gastos fixos futuros' }
          ],
          message: 'Para excluir um gasto fixo específico, encontre-o na lista de gastos do mês desejado.'
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

  const handleDelete = async (expense) => {
    if (expense.is_recurring) {
      setExpenseToDelete(expense);
      setDeleteOptions({
        type: 'recurring',
        showModal: true,
        options: [
          { id: 'all', label: 'Excluir todos os gastos fixos (passados e futuros)' },
          { id: 'past', label: 'Excluir somente gastos fixos passados' },
          { id: 'future', label: 'Excluir somente gastos fixos futuros' }
        ],
        message: 'Para excluir um gasto fixo específico, encontre-o na lista de gastos do mês desejado.'
      });
      return;
    }
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

  const handleSave = async (expenseData) => {
    try {
      const payload = {
        ...expenseData,
        user_id: auth.user.id
      };

      if (expenseData.is_recurring) {
        payload.start_date = expenseData.expense_date;
        payload.end_date = '2099-12-31';
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${editingExpense ? editingExpense.id : ''}`, {
        method: editingExpense ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar despesa');
      }

      setShowDeleteModal(false);
      setEditingExpense(null);
      fetchExpenses();
      toast.success(editingExpense ? 'Despesa atualizada com sucesso!' : 'Despesa criada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleDeleteConfirm = async (option) => {
    try {
      if (!expenseToDelete) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${expenseToDelete.id}/recurring`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ deleteType: option })
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir despesa');
      }

      setDeleteOptions({ showModal: false });
      setExpenseToDelete(null);
      fetchExpenses();
      toast.success('Despesa(s) excluída(s) com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir despesa');
    }
  };

  const handleEditClick = (expense) => {
    if (expense.is_recurring || expense.has_installments) {
      navigate('/edit-recurring-expenses');
    } else {
      setEditingExpense(expense);
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

  const formatRecurrenceType = (type) => {
    if (!type) return '';
    const types = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      annual: 'Anual'
    };
    return types[type] || '';
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
    <div className={`${styles.container} ${styles.expensesContainer}`}>
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
            title="Mostrar apenas despesas fixas"
          >
            <span className="material-icons">sync</span>
            Fixas
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
        <div className={styles.noData}>
          <div className={styles.emoji}>🔍</div>
          <h3>Nenhuma despesa encontrada para os filtros selecionados.</h3>
          <p>Tente mudar os filtros ou adicionar uma nova despesa.</p>
          <div className={styles.noDataActions}>
            <button 
              className={styles.addButton}
              onClick={() => navigate('/add-expense')}
            >
              Adicionar Nova Despesa
            </button>
            <button 
              className={styles.backToCurrentMonth}
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
                  <th>Descrição</th>
                  <th>Data</th>                  
                  <th>Categoria</th>
                  <th>Subcategoria</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Parcelas</th>
                  <th>Tipo</th>
                  <th>Recorrência</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className={selectedExpenses.includes(expense.id) ? styles.selected : ''}>
                    <td data-label="">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={(e) => handleSelectExpense(expense.id, e)}
                        className={expense.has_installments ? styles.installmentCheckbox : ''}
                      />
                    </td>
                    <td data-label="Descrição">{expense.description}</td>
                    <td data-label="Data">{formatDate(expense.expense_date)}</td>
                   
                    <td data-label="Categoria">{expense.Category?.category_name}</td>
                    <td data-label="Subcategoria">{expense.SubCategory?.subcategory_name}</td>
                    <td data-label="Valor">{formatCurrency(expense.amount)}</td>
                    <td data-label="Método">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {expense.payment_method === 'credit_card' ? (
                          <span className="material-icons" style={{ color: 'var(--primary-color)' }}>credit_card</span>
                        ) : expense.payment_method === 'debit_card' ? (
                          <span className="material-icons" style={{ color: 'var(--primary-color)' }}>credit_card</span>
                        ) : expense.payment_method === 'pix' ? (
                          <span className="material-icons" style={{ color: 'var(--success-color)' }}>pix</span>
                        ) : (
                          <span className="material-icons" style={{ color: 'var(--primary-color)' }}>payments</span>
                        )}
                        {expense.payment_method === 'credit_card' ? 'Crédito' :
                         expense.payment_method === 'debit_card' ? 'Débito' :
                         expense.payment_method === 'pix' ? 'Pix' : 'Dinheiro'}
                        {expense.is_recurring && (
                          <span 
                            className="material-icons" 
                            title="Despesa Fixa"
                            style={{ marginLeft: '4px' }}
                          >
                            sync
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Parcelas">
                      {expense.has_installments 
                        ? `${expense.current_installment}/${expense.total_installments}`
                        : '-'
                      }
                    </td>
                    <td data-label="Tipo">
                      {expense.is_recurring ? 'Fixo' : expense.has_installments ? 'Parcelado' : 'À Vista'}
                    </td>
                    <td data-label="Recorrência">
                      {expense.is_recurring ? formatRecurrenceType(expense.recurrence_type) : '-'}
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
          <div className={styles.bottomSpace}></div>
        </>
      )}

      {deleteOptions.showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Excluir Despesa Fixa</h2>
            <p>{deleteOptions.message}</p>
            <div className={styles.optionsContainer}>
              {deleteOptions.options.map(option => (
                <button
                  key={option.id}
                  className={styles.optionButton}
                  onClick={() => handleDeleteConfirm(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button 
              className={styles.cancelButton}
              onClick={() => {
                setDeleteOptions({ showModal: false });
                setExpenseToDelete(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onSave={handleSave}
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
