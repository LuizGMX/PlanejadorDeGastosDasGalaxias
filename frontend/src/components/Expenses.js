import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
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
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category: 'all',
    paymentMethod: 'all',
    hasInstallments: 'all',
    description: ''
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single',
    installmentGroupId: null
  });
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });

  const years = Array.from(
    { length: 5 },
    (_, i) => ({
      value: new Date().getFullYear() - i,
      label: (new Date().getFullYear() - i).toString()
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
        const response = await fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        if (!response.ok) throw new Error('Falha ao carregar categorias');
        const data = await response.json();
        setCategories([
          { value: 'all', label: 'Todas as Categorias' },
          ...data.map(cat => ({
            value: cat.id,
            label: cat.category_name
          }))
        ]);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
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
      setLoading(false);
      } catch (err) {
        setError('Erro ao carregar despesas. Por favor, tente novamente.');
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
    if (expense?.has_installments) {
      setDeleteOptions({
        type: 'single',
        installmentGroupId: expense.installment_group_id
      });
      setExpenseToDelete(expense);
      setShowDeleteModal(true);
      return;
    }

    if (expense) {
      setExpenseToDelete(expense);
    }
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      let url;
      let body;
      let method = 'DELETE';
      let headers = {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      };

      if (expenseToDelete) {
        if (expenseToDelete.has_installments) {
          url = '/api/expenses/installments';
          body = {
            installmentGroupId: expenseToDelete.installment_group_id,
            deleteType: deleteOptions.type,
            currentInstallment: expenseToDelete.current_installment
          };
        } else {
          url = `/api/expenses/${expenseToDelete.id}`;
          body = null;
        }
      } else {
        url = '/api/expenses/batch';
        body = { ids: selectedExpenses };
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir despesa(s)');
      }

      const responseData = await response.json();
      console.log('Resposta da exclusão:', responseData);

      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setSelectedExpenses([]);
      setDeleteOptions({ type: 'single', installmentGroupId: null });
      await fetchExpenses();
    } catch (err) {
      console.error('Erro na exclusão:', err);
      setError(err.message || 'Erro ao excluir despesa(s). Por favor, tente novamente.');
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
  };

  const handleUpdate = async (updatedExpense) => {
    try {
      const response = await fetch(`/api/expenses/${updatedExpense.id}`, {
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

  const formatSelectedPeriod = (type) => {
    if (type === 'months') {
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
    } else if (type === 'years') {
      if (filters.years.length === 0) return 'Selecione os anos';
      if (filters.years.length === years.length) return 'Todos os anos';
      if (filters.years.length === 1) {
        return filters.years[0].toString();
      }
      if (filters.years.length > 3) {
        return `${filters.years.length} anos selecionados`;
      }
      return filters.years.join(', ');
    } else if (type === 'category') {
      const selectedCategory = categories.find(c => c.value === filters.category);
      return selectedCategory ? selectedCategory.label : 'Categoria';
    } else if (type === 'paymentMethod') {
      const selectedMethod = paymentMethods.find(m => m.value === filters.paymentMethod);
      return selectedMethod ? selectedMethod.label : 'Método de Pagamento';
    } else if (type === 'hasInstallments') {
      const selectedOption = installmentOptions.find(o => o.value === filters.hasInstallments);
      return selectedOption ? selectedOption.label : 'Tipo de Despesa';
    } else if (type === 'description') {
      return filters.description;
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
        <h1>Minhas Despesas</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <div className={styles.searchField}>
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={filters.description}
              onChange={(e) => handleFilterChange('description', e.target.value)}
              className={styles.searchInput}
            />
            <span className="material-icons">search</span>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div 
            className={`${styles.modernSelect} ${openFilter === 'months' ? styles.active : ''}`}
            onClick={() => handleFilterClick('months')}
          >
            <div className={styles.modernSelectHeader}>
              <span>{formatSelectedPeriod('months')}</span>
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
              <span>{formatSelectedPeriod('years')}</span>
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

        <div className={styles.filterGroup}>
          <div 
            className={`${styles.modernSelect} ${openFilter === 'hasInstallments' ? styles.active : ''}`}
            onClick={() => handleFilterClick('hasInstallments')}
          >
            <div className={styles.modernSelectHeader}>
              <span>{formatSelectedPeriod('hasInstallments')}</span>
              <span className={`material-icons ${styles.arrow}`}>
                {openFilter === 'hasInstallments' ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            {openFilter === 'hasInstallments' && (
              <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                {installmentOptions.map(option => (
                  <label 
                    key={option.value} 
                    className={styles.modernCheckboxLabel}
                    onClick={handleCheckboxClick}
                  >
                    <div className={styles.modernCheckbox}>
                      <input
                        type="radio"
                        checked={filters.hasInstallments === option.value}
                        onChange={() => handleFilterChange('hasInstallments', option.value)}
                        className={styles.hiddenCheckbox}
                      />
                      <div className={styles.customCheckbox}>
                        <span className="material-icons">check</span>
                      </div>
                    </div>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
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

      {expenses.length > 0 ? (
        <>
          <div className={styles.totalExpenses}>
            <h3>Total de Despesas: {formatCurrency(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0))}</h3>
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
                  <tr key={expense.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={(e) => handleSelectExpense(expense.id, e)}
                        className={expense.has_installments ? styles.installmentCheckbox : ''}
                      />
                    </td>
                    <td>{formatDate(expense.expense_date)}</td>
                    <td>{expense.description}</td>
                    <td>{expense.Category?.category_name}</td>
                    <td>{expense.SubCategory?.subcategory_name}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>
                      {expense.payment_method === 'card' ? (
                        <span className="material-icons">credit_card</span>
                      ) : (
                        <span className="material-icons">pix</span>
                      )}
                    </td>
                    <td>
                      {expense.has_installments 
                        ? `${expense.current_installment}/${expense.total_installments}`
                        : '-'
                      }
                    </td>
                    <td>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEditClick(expense)}
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteClick(expense)}
                      >
                        <span className="material-icons">delete_outline</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className={styles.noData}>
          <p>Nenhuma despesa encontrada para o período selecionado.</p>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Confirmar Exclusão</h2>
            {expenseToDelete?.has_installments ? (
              <>
                <p>Como deseja excluir esta despesa parcelada?</p>
                <div className={styles.installmentOptions}>
                  <label>
                    <input
                      type="radio"
                      name="deleteType"
                      checked={deleteOptions.type === 'single'}
                      onChange={() => setDeleteOptions(prev => ({ ...prev, type: 'single' }))}
                    />
                    Apenas esta parcela ({expenseToDelete.current_installment}/{expenseToDelete.total_installments})
                  </label>
                  {expenseToDelete.current_installment < expenseToDelete.total_installments && (
                    <label>
                      <input
                        type="radio"
                        name="deleteType"
                        checked={deleteOptions.type === 'forward'}
                        onChange={() => setDeleteOptions(prev => ({ ...prev, type: 'forward' }))}
                      />
                      Esta e todas as próximas parcelas
                    </label>
                  )}
                  {expenseToDelete.current_installment > 1 && (
                    <label>
                      <input
                        type="radio"
                        name="deleteType"
                        checked={deleteOptions.type === 'backward'}
                        onChange={() => setDeleteOptions(prev => ({ ...prev, type: 'backward' }))}
                      />
                      Esta e todas as parcelas anteriores
                    </label>
                  )}
                  <label>
                    <input
                      type="radio"
                      name="deleteType"
                      checked={deleteOptions.type === 'all'}
                      onChange={() => setDeleteOptions(prev => ({ ...prev, type: 'all' }))}
                    />
                    Todas as parcelas
                  </label>
                </div>
              </>
            ) : (
              <p>
                {expenseToDelete
                  ? `Tem certeza que deseja excluir a despesa "${expenseToDelete.description}"?`
                  : `Tem certeza que deseja excluir ${selectedExpenses.length} ${
                      selectedExpenses.length === 1 ? 'despesa' : 'despesas'
                    }?`
              }
              </p>
            )}
            <div className={styles.modalButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowDeleteModal(false);
                  setExpenseToDelete(null);
                  setDeleteOptions({ type: 'single', installmentGroupId: null });
                }}
              >
                Cancelar
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleDelete}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onUpdate={handleUpdate}
          onCancel={() => setEditingExpense(null)}
        />
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
