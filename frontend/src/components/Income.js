import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import EditIncomeForm from './EditIncomeForm';

const Income = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    description: ''
  });
  const [openFilter, setOpenFilter] = useState(null);

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

  useEffect(() => {
    fetchIncomes();
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

  const fetchIncomes = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      if (filters.description) {
        queryParams.append('description', filters.description);
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
      setIncomes(data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar receitas. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const idsToDelete = incomeToDelete ? [incomeToDelete.id] : selectedIncomes;
      
      const response = await fetch('/api/incomes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ ids: idsToDelete })
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir receitas');
      }

      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setSelectedIncomes([]);
      fetchIncomes();
    } catch (err) {
      setError('Erro ao excluir receitas. Por favor, tente novamente.');
    }
  };

  const handleUpdate = async (updatedIncome) => {
    try {
      const response = await fetch(`/api/incomes/${updatedIncome.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(updatedIncome)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar receita');
      }

      setEditingIncome(null);
      fetchIncomes();
    } catch (err) {
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
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
      setSelectedIncomes(incomes.map(income => income.id));
    } else {
      setSelectedIncomes([]);
    }
  };

  const handleSelectIncome = (id) => {
    setSelectedIncomes(prev => {
      if (prev.includes(id)) {
        return prev.filter(incomeId => incomeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteClick = (income = null) => {
    if (income) {
      setIncomeToDelete(income);
    }
    setShowDeleteModal(true);
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

      <div className={styles.filterRow}>
        <div className={styles.modernSelect} onClick={() => handleFilterClick('months')}>
          <span>Mês: {formatSelectedPeriod('months')}</span>
          {openFilter === 'months' && (
            <div className={styles.dropdown}>
              <label>
                <input
                  type="checkbox"
                  checked={filters.months.length === months.length}
                  onChange={() => handleFilterChange('months', 'all')}
                  onClick={handleCheckboxClick}
                />
                Todos
              </label>
              {months.map(month => (
                <label key={month.value}>
                  <input
                    type="checkbox"
                    checked={filters.months.includes(month.value)}
                    onChange={() => handleFilterChange('months', month.value)}
                    onClick={handleCheckboxClick}
                  />
                  {month.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modernSelect} onClick={() => handleFilterClick('years')}>
          <span>Ano: {formatSelectedPeriod('years')}</span>
          {openFilter === 'years' && (
            <div className={styles.dropdown}>
              <label>
                <input
                  type="checkbox"
                  checked={filters.years.length === years.length}
                  onChange={() => handleFilterChange('years', 'all')}
                  onClick={handleCheckboxClick}
                />
                Todos
              </label>
              {years.map(year => (
                <label key={year.value}>
                  <input
                    type="checkbox"
                    checked={filters.years.includes(year.value)}
                    onChange={() => handleFilterChange('years', year.value)}
                    onClick={handleCheckboxClick}
                  />
                  {year.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={filters.description}
          onChange={(e) => handleFilterChange('description', e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {selectedIncomes.length > 0 && (
        <div className={styles.batchActions}>
          <button
            onClick={() => handleDeleteClick()}
            className={styles.deleteButton}
          >
            Excluir Selecionados ({selectedIncomes.length})
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
                  onChange={handleSelectAll}
                  checked={selectedIncomes.length === incomes.length && incomes.length > 0}
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
                    onChange={() => handleSelectIncome(income.id)}
                  />
                </td>
                <td>{income.description}</td>
                <td>{formatCurrency(income.amount)}</td>
                <td>{formatDate(income.date)}</td>
                <td>{income.Category?.category_name || '-'}</td>
                <td>{income.SubCategory?.subcategory_name || '-'}</td>
                <td>{income.Bank?.name || '-'}</td>
                <td>
                  <button
                    onClick={() => setEditingIncome(income)}
                    className={styles.editButton}
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(income)}
                    className={styles.deleteButton}
                  >
                    <span className="material-icons">delete</span>
                  </button>
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
            <p>
              {incomeToDelete
                ? 'Tem certeza que deseja excluir esta receita?'
                : `Tem certeza que deseja excluir ${selectedIncomes.length} receitas selecionadas?`}
            </p>
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
                onClick={handleDelete}
                className={styles.confirmButton}
              >
                Confirmar
              </button>
            </div>
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