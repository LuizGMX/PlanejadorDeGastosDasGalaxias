import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/income.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditIncomeForm from './EditIncomeForm';
import { toast } from 'react-hot-toast';

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
    },
    total: 0
  });
  const [deleteOption, setDeleteOption] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [noIncomesMessage, setNoIncomesMessage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);

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
    const fetchIncomes = async () => {
      try {
        const queryParams = new URLSearchParams();
        
        // Adiciona meses e anos como arrays
        filters.months.forEach(month => queryParams.append('months[]', month));
        filters.years.forEach(year => queryParams.append('years[]', year));
        
        // Adiciona outros filtros
        if (filters.category_id) queryParams.append('category_id', filters.category_id);
        if (filters.description) queryParams.append('description', filters.description);
        if (filters.is_recurring !== '') queryParams.append('is_recurring', filters.is_recurring);

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
          throw new Error('Erro ao carregar ganhos');
        }
        
        const data = await response.json();
        const incomesData = data.incomes || [];
        setIncomes(incomesData);
        setSelectedIncomes([]);
        setMetadata(data.metadata || { filters: { categories: [], recurring: [] }, total: 0 });

        // Define a mensagem quando não há ganhos
        if (!incomesData || incomesData.length === 0) {
          setNoIncomesMessage({
            message: 'Nenhum ganho encontrado para os filtros selecionados.',
            suggestion: 'Tente ajustar os filtros para ver mais resultados.'
          });
        } else {
          setNoIncomesMessage(null);
        }
      } catch (err) {
        setError('Erro ao carregar ganhos');
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
    if (type === 'description') {
      setFilters(prev => ({ ...prev, description: value }));
      return;
    }
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
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return '-';
    }
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

  const handleDelete = async (income) => {
    if (income.is_recurring) {
      setIncomeToDelete(income);
      setDeleteOptions({
        type: 'recurring',
        showModal: true,
        options: [
          { id: 'all', label: 'Excluir todos os ganhos fixos (passados e futuros)' },
          { id: 'past', label: 'Excluir somente ganhos fixos passados' },
          { id: 'future', label: 'Excluir somente ganhos fixos futuros' }
        ],
        message: 'Para excluir um ganho fixo específico, encontre-o na lista de ganhos do mês desejado.'
      });
      return;
    }
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
          throw new Error('Falha ao excluir ganhos');
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

        // Recarrega a lista de ganhos
        await fetchIncomes();
        return;
      }

      let url = `${process.env.REACT_APP_API_URL}/api/incomes/${income.id}`;
      if (deleteOption) {
        url += `?deleteOption=${deleteOption}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir ganho');
      }

      const data = await response.json();

      // Limpa os estados do modal
      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setDeleteOption(null);

      // Mostra mensagem de sucesso
      setDeleteSuccess({
        message: data.message,
        count: 1
      });

      // Remove a mensagem após 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      // Recarrega a lista de ganhos
      await fetchIncomes();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setError('Erro ao excluir ganho(s)');
    }
  };

  const handleDeleteClick = (income = null) => {
    if (income) {
      setIncomeToDelete(income);
      setDeleteOptions({ type: 'single' });
    } else {
      setDeleteOptions({ type: 'bulk' });
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
        throw new Error('Falha ao atualizar ganho');
      }

      setEditingIncome(null);
      await fetchIncomes();
    } catch (error) {
      setError('Erro ao atualizar ganho. Por favor, tente novamente.');
    }
  };

  const handleEditClick = (income) => {
    if (income.is_recurring) {
      navigate('/edit-recurring-incomes');
    } else {
      setEditingIncome(income);
    }
  };

  const handleSave = async (incomeData) => {
    try {
      const payload = {
        ...incomeData,
        user_id: auth.userId
      };

      if (incomeData.is_recurring) {
        payload.start_date = incomeData.date;
        payload.end_date = '2099-12-31';
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes${editingIncome ? `/${editingIncome.id}` : ''}`, {
        method: editingIncome ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar ganho');
      }

      setShowDeleteModal(false);
      setEditingIncome(null);
      fetchIncomes();
      toast.success(editingIncome ? 'Ganho atualizado com sucesso!' : 'Ganho criado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar ganho');
    }
  };

  const handleDeleteConfirm = async (option) => {
    try {
      if (!incomeToDelete) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${incomeToDelete.id}/recurring`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ deleteType: option })
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir ganho');
      }

      setDeleteOptions({ showModal: false });
      setIncomeToDelete(null);
      fetchIncomes();
      toast.success('Ganho(s) excluído(s) com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir ganho');
    }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meus Ganhos</h1>
        <button
          className={styles.addButton}
          onClick={() => navigate('/add-income')}
        >
          
          Adicionar Ganho
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
              title="Mostrar apenas ganhos fixos"
            >
              <span className="material-icons">sync</span>
              Fixos
            </button>
        </div>

        {incomes.length > 0 && (
          <div className={styles.totalInfo}>
            <span>Total de ganhos para os filtros selecionados: </span>
            <strong>{formatCurrency(incomes.reduce((acc, income) => acc + parseFloat(income.amount), 0))}</strong>
          </div>
        )}

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
              <tr key={income.id} className={selectedIncomes.includes(income.id) ? styles.selected : ''}>
                <td data-label="">
                  <input
                    type="checkbox"
                    checked={selectedIncomes.includes(income.id)}
                    onChange={(e) => handleSelectIncome(income.id, e)}
                    className={income.is_recurring ? styles.recurringCheckbox : ''}
                  />
                </td>
                <td data-label="Descrição">{income.description}</td>
                <td data-label="Valor">R$ {Number(income.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td data-label="Data">
                  {income.is_recurring 
                    ? formatDate(income.date)
                    : formatDate(income.date)}
                </td>
                <td data-label="Categoria">
                  {income.Category?.category_name || '-'}
                  {income.is_recurring && (
                    <span className="material-icons" style={{ marginLeft: '4px', fontSize: '16px', verticalAlign: 'middle' }}>
                      sync
                    </span>
                  )}
                </td>
                <td data-label="Subcategoria">{income.SubCategory?.subcategory_name || '-'}</td>
                <td data-label="Banco">{income.Bank?.name || '-'}</td>
                <td data-label="Ações">
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleEditClick(income)}
                      className={styles.editButton}
                      title="Editar"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(income)}
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
          Para excluir ganhos recorrentes, use o botão
          <span className="material-icons" style={{ verticalAlign: 'middle', marginLeft: '4px' }}>delete_outline</span>
        </div>
      )}

      {deleteOptions.showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Excluir Ganho Fixo</h2>
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
                setIncomeToDelete(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editingIncome && (
        <EditIncomeForm
          income={editingIncome}
          onSave={handleSave}
          onCancel={() => setEditingIncome(null)}
        />
      )}
    </div>
  );
};

export default Income; 