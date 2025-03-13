import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/income.module.css';
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
    fetchIncomes();
  }, [filters]);

  const fetchIncomes = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      if (filters.description) {
        queryParams.append('description', filters.description);
      }

      if (filters.category_id) {
        queryParams.append('category_id', filters.category_id);
      }

      if (filters.is_recurring !== '') {
        queryParams.append('is_recurring', filters.is_recurring);
      }

      const response = await fetch(`/api/incomes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar receitas');
      }

      const data = await response.json();
      setIncomes(data.incomes);
      setMetadata(data.metadata);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar receitas. Por favor, tente novamente.');
      setLoading(false);
    }
  };

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

  const handleDelete = async (id, deleteFuture = false, deletePast = false, deleteAll = false) => {
    try {
      let url = `/api/incomes/${id}`;
      const queryParams = new URLSearchParams();

      if (deleteFuture) {
        queryParams.append('delete_future', 'true');
      }
      if (deletePast) {
        queryParams.append('delete_past', 'true');
      }
      if (deleteAll) {
        queryParams.append('delete_all', 'true');
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
        throw new Error('Falha ao excluir receita');
      }

      setIncomes(incomes.filter(income => income.id !== id));
    } catch (err) {
      setError('Erro ao excluir receita. Por favor, tente novamente.');
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
                  {category_name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <button
              className={`${styles.recurringButton} ${filters.is_recurring === 'true' ? styles.active : ''}`}
              onClick={() => handleFilterChange('is_recurring', filters.is_recurring === 'true' ? '' : 'true')}
              title="Mostrar apenas receitas recorrentes"
            >
              <span className="material-icons">sync</span>
              Recorrentes
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
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
                <td>{income.description}</td>
                <td>{formatCurrency(income.amount)}</td>
                <td>{formatDate(income.date)}</td>
                <td>
                  {income.Category?.category_name || '-'}
                  {income.recurring_info && (
                    <span className={styles.badge} title={income.recurring_info.badge.tooltip}>
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
                          handleDelete(incomeToDelete.id);
                          break;
                        case 'future':
                          handleDelete(incomeToDelete.id, true);
                          break;
                        case 'past':
                          handleDelete(incomeToDelete.id, false, true);
                          break;
                        case 'all':
                          handleDelete(incomeToDelete.id, false, false, true);
                          break;
                      }
                      setShowDeleteModal(false);
                    }}
                    className={styles.deleteButton}
                    disabled={!deleteOption}
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
                    onClick={() => {
                      handleDelete(incomeToDelete.id);
                      setShowDeleteModal(false);
                    }}
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