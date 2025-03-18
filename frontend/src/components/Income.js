import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/income.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditIncomeForm from './EditIncomeForm';

const Income = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    description: '',
    category_id: '',
    is_recurring: ''
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [metadata, setMetadata] = useState({
    filters: {
      categories: [],
      recurring: []
    }
  });
  const [deleteOption, setDeleteOption] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [noIncomesMessage, setNoIncomesMessage] = useState(null);

  // Lista de anos para o filtro
  const years = Array.from(
    { length: 20 },
    (_, i) => ({
      value: new Date().getFullYear() + i,
      label: (new Date().getFullYear() + i).toString()
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
    const fetchIncomes = async () => {
      try {
        const queryParams = new URLSearchParams();
        
        // Adiciona meses e anos como arrays
        filters.months.forEach(month => queryParams.append('months[]', month));
        filters.years.forEach(year => queryParams.append('years[]', year));

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Erro ao carregar receitas');
        }
        
        const data = await response.json();
        const incomesData = data.incomes || [];
        setIncomes(incomesData);
        setSelectedIncomes([]);
        setMetadata(data.metadata || { filters: { categories: [], recurring: [] } });

        // Define a mensagem quando não há receitas
        if (!incomesData || incomesData.length === 0) {
          // Verifica se há filtros ativos
          const hasActiveFilters = filters.months.length !== 1 || 
                                 filters.years.length !== 1 || 
                                 filters.description !== '' || 
                                 filters.category_id !== '' || 
                                 filters.is_recurring !== '';

          setNoIncomesMessage(hasActiveFilters ? {
            message: 'Nenhuma receita encontrada para os filtros selecionados.',
            suggestion: 'Tente ajustar os filtros para ver mais resultados.'
          } : {
            message: 'Você ainda não tem receitas cadastradas para este período.',
            suggestion: 'Que tal começar adicionando sua primeira receita?'
          });
        } else {
          setNoIncomesMessage(null);
        }

      } catch (err) {
        setError('Erro ao carregar receitas');
      } finally {
        setLoading(false);
      }
    };

    fetchIncomes();
  }, [auth.token, filters, navigate]);

  const handleFilterClick = (filterType) => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleFilterChange = (type, value) => {
    if (type === 'months' || type === 'years') {
      setFilters(prev => {
        const currentValues = prev[type];
        let newValues;

        if (value === 'all') {
          newValues = currentValues.length === (type === 'months' ? months.length : years.length)
            ? []
            : (type === 'months' ? months.map(m => m.value) : years.map(y => y.value));
        } else {
          newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        }

        return { ...prev, [type]: newValues };
      });
    } else {
      setFilters(prev => ({ ...prev, [type]: value }));
    }
  };

  const formatSelectedPeriod = (type) => {
    const selected = filters[type];
    const options = type === 'months' ? months : years;
    
    if (selected.length === 0) return 'Nenhum selecionado';
    if (selected.length === options.length) return 'Todos';
    
    return selected
      .map(value => options.find(option => option.value === value)?.label)
      .join(', ');
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
      const nonRecurringIncomes = incomes
        .filter(income => !income.is_recurring)
        .map(income => income.id);
      setSelectedIncomes(nonRecurringIncomes);
    } else {
      setSelectedIncomes([]);
    }
  };

  const handleSelectIncome = (id, event) => {
    const income = incomes.find(i => i.id === id);
    if (income?.is_recurring) {
      const rect = event.target.getBoundingClientRect();
      setMessagePosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 5
      });
      setShowInstallmentMessage(true);
      setTimeout(() => setShowInstallmentMessage(false), 3000);
      return;
    }

    setSelectedIncomes(prev => {
      if (prev.includes(id)) {
        return prev.filter(incomeId => incomeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDelete = async (id) => {
    try {
      if (deleteOptions.type === 'bulk') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/bulk`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: selectedIncomes })
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir receitas');
        }

        const data = await response.json();

        // Limpa os estados do modal
        setShowDeleteModal(false);
        setIncomeToDelete(null);
        setDeleteOptions({ type: 'single' });
        setSelectedIncomes([]);

        // Mostra mensagem de sucesso
        setDeleteSuccess({
          message: data.message,
          count: data.count
        });

        // Remove a mensagem após 3 segundos
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);

        // Recarrega a lista de receitas
        await fetchIncomes();
        return;
      }

      let url = `${process.env.REACT_APP_API_URL}/api/incomes/${id}`;
      const queryParams = new URLSearchParams();

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

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir receita');
      }

      const data = await response.json();
      setDeleteSuccess({
        message: data.message,
        count: data.count
      });

      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      await fetchIncomes();
    } catch (err) {
      setError('Erro ao excluir receita. Por favor, tente novamente.');
    } finally {
      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setDeleteOption(null);
    }
  };

  const handleDeleteClick = (income = null) => {
    if (income) {
      setIncomeToDelete(income);
      if (income.is_recurring) {
        setDeleteOptions({
          type: 'recurring'
        });
      } else {
        setDeleteOptions({
          type: 'single'
        });
      }
    } else {
      // Deleção em massa
      setIncomeToDelete(null);
      setDeleteOptions({
        type: 'bulk',
        ids: selectedIncomes
      });
    }
    setShowDeleteModal(true);
  };

  const handleUpdate = async (updatedIncome) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${updatedIncome.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedIncome)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar receita');
      }

      setEditingIncome(null);
      await fetchIncomes();
    } catch (error) {
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
    }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Receitas</h1>
        <button
          className={styles.addButton}
          onClick={() => navigate('/add-income')}
        >
          
          Adicionar Receita
        </button>
      </div>

      <div className={styles.filtersContainer}>
        {deleteSuccess && (
          <div className={sharedStyles.successMessage}>
            {deleteSuccess.message} {deleteSuccess.count > 1 ? `(${deleteSuccess.count} itens)` : ''}
          </div>
        )}

        <div className={styles.filterGroup}>
          <button
            className={styles.filterButton}
            onClick={() => handleFilterClick('months')}
          >
            <span>Mês: {formatSelectedPeriod('months')}</span>
            <span className="material-icons">
              {openFilter === 'months' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {openFilter === 'months' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={filters.months.length === months.length}
                  onChange={() => handleFilterChange('months', 'all')}
                />
                Todos
              </label>
              {months.map(month => (
                <label key={month.value} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={filters.months.includes(month.value)}
                    onChange={() => handleFilterChange('months', month.value)}
                  />
                  {month.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterGroup}>
          <button
            className={styles.filterButton}
            onClick={() => handleFilterClick('years')}
          >
            <span>Ano: {formatSelectedPeriod('years')}</span>
            <span className="material-icons">
              {openFilter === 'years' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {openFilter === 'years' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={filters.years.length === years.length}
                  onChange={() => handleFilterChange('years', 'all')}
                />
                Todos
              </label>
              {years.map(year => (
                <label key={year.value} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={filters.years.includes(year.value)}
                    onChange={() => handleFilterChange('years', year.value)}
                  />
                  {year.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterButton} ${filters.category_id ? styles.active : ''}`}
            onClick={() => handleFilterClick('categories')}
          >
            <span>
              Categoria: {filters.category_id 
                ? metadata.filters.categories.find(c => c.id === filters.category_id)?.name 
                : 'Todas'}
            </span>
            <span className="material-icons">
              {openFilter === 'categories' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {openFilter === 'categories' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterOption}>
                <input
                  type="radio"
                  checked={!filters.category_id}
                  onChange={() => handleFilterChange('category_id', '')}
                />
                Todas
              </label>
              {metadata.filters.categories.map(category => (
                <label key={category.id} className={styles.filterOption}>
                  <input
                    type="radio"
                    checked={filters.category_id === category.id}
                    onChange={() => handleFilterChange('category_id', category.id)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          )}
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

      {selectedIncomes.length > 0 && (
        <div >
          <button
            className={styles.deleteButton}
            onClick={() => handleDeleteClick()}
          >
            Excluir {selectedIncomes.length} {selectedIncomes.length === 1 ? 'item selecionado' : 'itens selecionados'}
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
                  checked={selectedIncomes.length === incomes.filter(i => !i.is_recurring).length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Banco</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map(income => (
              <tr key={income.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIncomes.includes(income.id)}
                    onChange={(e) => handleSelectIncome(income.id, e)}
                    className={income.is_recurring ? styles.recurringCheckbox : ''}
                  />
                </td>
                <td>{income.description}</td>
                <td>{formatCurrency(income.amount)}</td>
                <td>{formatDate(income.date)}</td>
                <td>
                  {income.Category?.category_name || '-'}
                  {income.recurring_info && (
                    <span className="material-icons" title={income.recurring_info.badge.tooltip}>
                      <span className="material-icons">sync</span>
                    </span>
                  )}
                </td>
                <td>{income.SubCategory?.subcategory_name || '-'}</td>
                <td>{income.Bank?.name || '-'}</td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => setEditingIncome(income)}
                      className={styles.editButton}
                      title="Editar"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setIncomeToDelete(income);
                        setShowDeleteModal(true);
                      }}
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

      {showInstallmentMessage && (
        <div 
          className={styles.installmentMessage}
          style={{
            position: 'absolute',
            left: messagePosition.x,
            top: messagePosition.y
          }}
        >
          Para excluir receitas recorrentes, use o botão
          <span className="material-icons" style={{ verticalAlign: 'middle', marginLeft: '4px' }}>delete_outline</span>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Confirmar Exclusão</h2>
            {incomeToDelete?.is_recurring ? (
              <>
                <p>Como você deseja excluir esta receita recorrente?</p>
                <div className={styles.deleteOptions}>
                  <div className={styles.deleteOption}>
                    <input
                      type="radio"
                      id="delete-single"
                      checked={deleteOption === 'single'}
                      onChange={() => setDeleteOption('single')}
                    />
                    <label htmlFor="delete-single">Apenas esta</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="radio"
                      id="delete-future"
                      checked={deleteOption === 'future'}
                      onChange={() => setDeleteOption('future')}
                    />
                    <label htmlFor="delete-future">Esta e futuras</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="radio"
                      id="delete-past"
                      checked={deleteOption === 'past'}
                      onChange={() => setDeleteOption('past')}
                    />
                    <label htmlFor="delete-past">Esta e passadas</label>
                  </div>
                  <div className={styles.deleteOption}>
                    <input
                      type="radio"
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
                      setIncomeToDelete(null);
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
                        case 'future':
                        case 'past':
                        case 'all':
                          handleDelete(incomeToDelete.id);
                          break;
                      }
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
                <p>Tem certeza que deseja excluir {selectedIncomes.length} {selectedIncomes.length === 1 ? 'receita' : 'receitas'}?</p>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setIncomeToDelete(null);
                      setDeleteOptions({ type: 'single' });
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(null)}
                    className={styles.deleteButton}
                  >
                    Excluir
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Tem certeza que deseja excluir esta receita?</p>
                <div className={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setIncomeToDelete(null);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(incomeToDelete.id)}
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

      {editingIncome && (
        <EditIncomeForm
          income={editingIncome}
          onSave={handleUpdate}
          onCancel={() => setEditingIncome(null)}
        />
      )}
    </div>
  );
};

export default Income; 