import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditIncomeForm from './EditIncomeForm';
import { toast } from 'react-hot-toast';
import { 
  BsPlusLg, 
  BsCash, 
  BsCalendar3, 
  BsFilter, 
  BsSearch, 
  BsPencil, 
  BsTrash, 
  BsBank2, 
  BsExclamationTriangle, 
  BsRepeat, 
  BsCurrencyDollar,
  BsX,
  BsCheckAll,
  BsCheck2,
  BsFolderSymlink,
  BsListCheck,
  BsChevronDown,
  BsChevronUp,
  BsArrowClockwise
} from 'react-icons/bs';

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
  const [banks, setBanks] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    fetchIncomes();
  }, [auth.token, filters, navigate]);

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
      setDeleteOption('single');
      
      if (income.is_recurring) {
        setDeleteOptions({
          type: 'single'
        });
      } else {
        setDeleteOptions({
          type: 'single'
        });
      }
    } else {
      setIncomeToDelete(null);
      setDeleteOption(null);
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
        throw new Error('Falha ao atualizar ganho');
      }

      setEditingIncome(null);
      await fetchIncomes();
    } catch (error) {
      setError('Erro ao atualizar ganho. Por favor, tente novamente.');
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
  };

  const handleSave = async (incomeData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${incomeData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(incomeData)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      setEditingIncome(null);
      // Atualiza a lista de receitas após a edição
      const updatedIncomes = incomes.map(income => 
        income.id === incomeData.id ? incomeData : income
      );
      setIncomes(updatedIncomes);
      toast.success('Receita atualizada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar receita');
    }
  };

  const handleDeleteConfirm = async (option) => {
    try {
      if (!incomeToDelete) return;
      setIsDeleting(true);

      let url = `${process.env.REACT_APP_API_URL}/api/incomes/${incomeToDelete.id}`;
      const queryParams = new URLSearchParams();

      if (incomeToDelete.is_recurring) {
        switch (option) {
          case 'all':
            queryParams.append('delete_all', 'true');
            break;
          case 'past':
            queryParams.append('delete_past', 'true');
            queryParams.append('reference_date', incomeToDelete.date);
            break;
          case 'future':
            queryParams.append('delete_future', 'true');
            queryParams.append('reference_date', incomeToDelete.date);
            break;
          default:
            break;
        }

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir receita');
      }

      setShowDeleteModal(false);
      setIncomeToDelete(null);
      await fetchIncomes();
      toast.success('Receita(s) excluída(s) com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir receita');
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={dataTableStyles.pageContainer}>
      <div className={dataTableStyles.pageHeader}>
        <h1 className={dataTableStyles.pageTitle}>Meus Ganhos</h1>
        <button 
          onClick={() => navigate('/add-income')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Novo Ganho
        </button>
      </div>

      <div className={dataTableStyles.dataContainer}>
        <div className={dataTableStyles.filtersContainer}>
          {deleteSuccess && (
            <div className={dataTableStyles.successMessage}>
              {deleteSuccess.message} {deleteSuccess.count > 1 ? `(${deleteSuccess.count} itens)` : ''}
            </div>
          )}

          <div className={dataTableStyles.filterRow}>
            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsCalendar3 /> Meses
              </label>
              <div 
                className={`${dataTableStyles.modernSelect} ${openFilter === 'months' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('months')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>
                    {filters.months.length === 0 
                      ? 'Nenhum mês selecionado' 
                      : filters.months.length === 1 
                        ? months.find(m => m.value === filters.months[0])?.label 
                        : filters.months.length === months.length 
                          ? 'Todos os meses' 
                          : `${filters.months.length} meses selecionados`}
                  </span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'months' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.months.length === months.length}
                          onChange={() => handleFilterChange('months', 'all')}
                          onClick={handleCheckboxClick}
                          className={dataTableStyles.hiddenCheckbox}
                        />
                        <div className={dataTableStyles.customCheckbox}></div>
                      </div>
                      <span>Todos os meses</span>
                    </label>
                    {months.map(month => (
                      <label key={month.value} className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="checkbox"
                            checked={filters.months.includes(month.value)}
                            onChange={() => handleFilterChange('months', month.value)}
                            onClick={handleCheckboxClick}
                            className={dataTableStyles.hiddenCheckbox}
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        <span>{month.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsCalendar3 /> Anos
              </label>
              <div 
                className={`${dataTableStyles.modernSelect} ${openFilter === 'years' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('years')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>
                    {filters.years.length === 0 
                      ? 'Nenhum ano selecionado' 
                      : filters.years.length === 1 
                        ? filters.years[0] 
                        : filters.years.length === years.length 
                          ? 'Todos os anos' 
                          : `${filters.years.length} anos selecionados`}
                  </span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'years' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.years.length === years.length}
                          onChange={() => handleFilterChange('years', 'all')}
                          onClick={handleCheckboxClick}
                          className={dataTableStyles.hiddenCheckbox}
                        />
                        <div className={dataTableStyles.customCheckbox}></div>
                      </div>
                      <span>Todos os anos</span>
                    </label>
                    {years.map(year => (
                      <label key={year.value} className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="checkbox"
                            checked={filters.years.includes(year.value)}
                            onChange={() => handleFilterChange('years', year.value)}
                            onClick={handleCheckboxClick}
                            className={dataTableStyles.hiddenCheckbox}
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        <span>{year.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsFolderSymlink /> Categoria
              </label>
              <div 
                className={`${dataTableStyles.modernSelect} ${openFilter === 'category' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('category')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>
                    {filters.category_id 
                      ? metadata.filters.categories.find(c => c.id === filters.category_id)?.name || 'Selecionada' 
                      : 'Todas as categorias'}
                  </span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'category' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label 
                      className={dataTableStyles.modernCheckboxLabel}
                      onClick={(e) => {
                        handleCheckboxClick(e);
                        handleFilterChange('category_id', '');
                      }}
                    >
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="radio"
                          checked={filters.category_id === ''}
                          className={dataTableStyles.hiddenCheckbox}
                          readOnly
                        />
                        <div className={dataTableStyles.customCheckbox}></div>
                      </div>
                      <span>Todas as categorias</span>
                    </label>
                    {metadata.filters.categories.map(category => (
                      <label 
                        key={category.id} 
                        className={dataTableStyles.modernCheckboxLabel}
                        onClick={(e) => {
                          handleCheckboxClick(e);
                          handleFilterChange('category_id', category.id);
                        }}
                      >
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="radio"
                            checked={filters.category_id === category.id}
                            className={dataTableStyles.hiddenCheckbox}
                            readOnly
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flex: '1' }}>
              <div className={dataTableStyles.filterGroup} style={{ flex: '1' }}>
                <label className={dataTableStyles.filterLabel}>
                  <BsSearch /> Descrição
                </label>
                <div className={dataTableStyles.searchField}>
                  <BsSearch className={dataTableStyles.searchIcon} />
                  <input 
                    type="text" 
                    placeholder="Buscar por descrição..." 
                    value={filters.description} 
                    onChange={(e) => handleFilterChange('description', e.target.value)} 
                    className={dataTableStyles.searchInput}
                  />
                </div>
              </div>
              
              <button
                className={`${dataTableStyles.recurringButton} ${filters.is_recurring === 'true' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterChange('is_recurring', filters.is_recurring === 'true' ? '' : 'true')}
                title="Mostrar apenas ganhos fixos"
                style={{ alignSelf: 'flex-end' }}
              >
                <BsRepeat /> Fixos
              </button>
            </div>
          </div>

          {incomes.length > 0 && (
            <div className={dataTableStyles.totalInfo}>
              <span>Total de ganhos para os filtros selecionados: </span>
              <strong>{formatCurrency(incomes.reduce((acc, income) => acc + parseFloat(income.amount), 0))}</strong>
            </div>
          )}
        </div>

        {selectedIncomes.length > 0 && (
          <div className={dataTableStyles.bulkActions}>
            <button
              className={dataTableStyles.bulkDeleteButton}
              onClick={() => handleDeleteClick()}
            >
              <BsTrash /> Excluir {selectedIncomes.length} {selectedIncomes.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </button>
          </div>
        )}

        {loading ? (
          <div className={dataTableStyles.loadingContainer}>
            <div className={dataTableStyles.loadingSpinner}></div>
            <p>Carregando ganhos...</p>
          </div>
        ) : incomes.length === 0 ? (
          <div className={dataTableStyles.noDataContainer}>
            <BsCash className={dataTableStyles.noDataIcon} />
            <h3 className={dataTableStyles.noDataMessage}>
              {noIncomesMessage?.message || "Nenhum ganho encontrado para os filtros selecionados."}
            </h3>
            <p className={dataTableStyles.noDataSuggestion}>
              {noIncomesMessage?.suggestion || "Tente ajustar os filtros ou adicionar um novo ganho."}
            </p>
            <div className={dataTableStyles.noDataActions}>
              <button 
                className={dataTableStyles.primaryButton}
                onClick={() => navigate('/add-income')}
              >
                <BsPlusLg /> Adicionar Novo Ganho
              </button>
              <button 
                className={dataTableStyles.secondaryButton}
                onClick={() => {
                  setFilters({
                    months: [new Date().getMonth() + 1],
                    years: [new Date().getFullYear()],
                    category_id: '',
                    description: '',
                    is_recurring: ''
                  });
                }}
              >
                <BsArrowClockwise /> Voltar para Mês Atual
              </button>
            </div>
          </div>
        ) : (
          <div className={dataTableStyles.tableContainer}>
            <table className={dataTableStyles.table}>
              <thead>
                <tr>
                  <th width="40">
                    <label className={dataTableStyles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={selectedIncomes.length === incomes.filter(i => !i.is_recurring).length && incomes.length > 0}
                        onChange={handleSelectAll}
                        className={dataTableStyles.checkbox}
                      />
                      <span className={dataTableStyles.checkmark}></span>
                    </label>
                  </th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Banco</th>
                  <th>Tipo</th>
                  <th width="100">Ações</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id} className={`${dataTableStyles.tableRow} ${selectedIncomes.includes(income.id) ? dataTableStyles.selected : ''}`}>
                    <td>
                      <label className={dataTableStyles.checkboxContainer}>
                        <input
                          type="checkbox"
                          checked={selectedIncomes.includes(income.id)}
                          onChange={(e) => handleSelectIncome(income.id, e)}
                          className={dataTableStyles.checkbox}
                          disabled={income.is_recurring}
                        />
                        <span className={dataTableStyles.checkmark}></span>
                      </label>
                    </td>
                    <td>{income.description}</td>
                    <td>
                      <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.incomeAmount}`}>
                        R$ {Number(income.amount).toFixed(2)}
                      </span>
                    </td>
                    <td>{formatDate(income.date)}</td>
                    <td>
                      <div className={dataTableStyles.cellWithIcon}>
                        <BsFolderSymlink />
                        {income.Category?.category_name || '-'}
                      </div>
                    </td>
                    <td>
                      <div className={dataTableStyles.cellWithIcon}>
                        <BsBank2 />
                        {income.Bank?.name || '-'}
                      </div>
                    </td>
                    <td>
                      {income.is_recurring ? (
                        <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                          <BsRepeat /> Fixo
                        </span>
                      ) : (
                        <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                          <BsCurrencyDollar /> Único
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={dataTableStyles.actionButtons}>
                        <button 
                          onClick={() => handleEditClick(income)} 
                          className={dataTableStyles.actionButton}
                          title="Editar"
                        >
                          <BsPencil />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(income)} 
                          className={`${dataTableStyles.actionButton} ${dataTableStyles.delete}`}
                          title="Excluir"
                        >
                          <BsTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInstallmentMessage && (
        <div 
          className={dataTableStyles.installmentMessage}
          style={{
            position: 'absolute',
            left: messagePosition.x,
            top: messagePosition.y
          }}
        >
          Para excluir ganhos recorrentes, use o botão
          <BsTrash className={dataTableStyles.inlineIcon} />
        </div>
      )}

      {showDeleteModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={`${dataTableStyles.modalContent} ${dataTableStyles.deleteModal}`}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle size={24} className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setIncomeToDelete(null);
                  setDeleteOption(null);
                }} 
                className={dataTableStyles.closeButton}
              >
                <BsX size={20} />
              </button>
            </div>
            
            <div className={dataTableStyles.modalBody}>
              {deleteOptions.type === 'bulk' ? (
                <div className={dataTableStyles.confirmMessage}>
                  <p>Você está prestes a excluir <strong>{selectedIncomes.length}</strong> receitas selecionadas.</p>
                  <p className={dataTableStyles.warningText}>Esta ação não pode ser desfeita.</p>
                </div>
              ) : (
                <div className={dataTableStyles.modalDetails}>
                  <div className={dataTableStyles.confirmMessage}>
                    <p>
                      Deseja excluir esta receita?
                    </p>
                    <p className={dataTableStyles.warningText}>Esta ação não pode ser desfeita.</p>
                  </div>
                  
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Descrição:</span>
                    <span className={dataTableStyles.detailValue}>{incomeToDelete?.description}</span>
                  </div>
                  
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Valor:</span>
                    <span className={dataTableStyles.detailValue}>R$ {Number(incomeToDelete?.amount || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Data:</span>
                    <span className={dataTableStyles.detailValue}>{formatDate(incomeToDelete?.date)}</span>
                  </div>
                  
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Categoria:</span>
                    <span className={dataTableStyles.detailValue}>{incomeToDelete?.Category?.category_name || '-'}</span>
                  </div>
                </div>
              )}
              
              {deleteOptions.type === 'single' && incomeToDelete?.is_recurring && (
                <div className={dataTableStyles.optionsContainer}>
                  <div className={dataTableStyles.optionHeader}>
                    <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                      <BsRepeat size={14} /> Receita fixa mensal
                    </div>
                  </div>
                  
                  <div className={dataTableStyles.optionsList}>
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'single' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="single" 
                          checked={deleteOption === 'single'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Apenas esta ocorrência</span>
                        <span className={dataTableStyles.optionDescription}>
                          Somente esta receita específica será excluída
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'future' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="future" 
                          checked={deleteOption === 'future'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Esta e todas as futuras</span>
                        <span className={dataTableStyles.optionDescription}>
                          Esta ocorrência e todas as próximas serão excluídas
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'all' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="all" 
                          checked={deleteOption === 'all'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Todas as ocorrências</span>
                        <span className={dataTableStyles.optionDescription}>
                          Todas (passadas e futuras) serão excluídas
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'past' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="past" 
                          checked={deleteOption === 'past'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Apenas as anteriores</span>
                        <span className={dataTableStyles.optionDescription}>
                          Somente ocorrências anteriores a esta data serão excluídas
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <div className={dataTableStyles.modalActions}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setIncomeToDelete(null);
                  setDeleteOption(null);
                }} 
                className={dataTableStyles.secondaryButton}
              >
                <BsX size={18} /> Cancelar
              </button>
              <button 
                onClick={() => {
                  if (deleteOptions.type === 'bulk') {
                    handleDelete();
                  } else if (incomeToDelete) {
                    if (incomeToDelete.is_recurring && deleteOption) {
                      handleDeleteConfirm(deleteOption);
                    } else {
                      handleDelete(incomeToDelete);
                    }
                  }
                }}
                className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
                disabled={(incomeToDelete?.is_recurring && !deleteOption) || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className={dataTableStyles.buttonSpinner}></div>
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <BsTrash size={16} /> Excluir
                  </>
                )}
              </button>
            </div>
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