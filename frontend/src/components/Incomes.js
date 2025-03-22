import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/incomes.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditIncomeForm from './EditIncomeForm';
import { toast } from 'react-hot-toast';

const Incomes = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category: 'all',
    description: '',
    is_recurring: ''
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [noIncomesMessage, setNoIncomesMessage] = useState(null);
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/incomes/categories`, {
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
    fetchIncomes();
  }, [auth.token, filters]);

  const fetchIncomes = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      if (filters.category !== 'all') {
        queryParams.append('category_id', filters.category);
      }
      if (filters.description) {
        queryParams.append('description', filters.description);
      }
      if (filters.is_recurring !== '') {
        queryParams.append('is_recurring', filters.is_recurring);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar ganhos');
      }

      const data = await response.json();
      setIncomes(data.incomes || []);
      setSelectedIncomes([]);

      if (!data.incomes || data.incomes.length === 0) {
        const hasActiveFilters = filters.months.length !== 1 || 
                               filters.years.length !== 1 || 
                               filters.category !== 'all' || 
                               filters.description !== '' || 
                               filters.is_recurring !== '';

        setNoIncomesMessage(hasActiveFilters ? {
          message: 'Nenhum ganho encontrado para os filtros selecionados.',
          suggestion: 'Tente ajustar os filtros para ver mais resultados.'
        } : {
          message: 'Você ainda não tem ganhos cadastrados para este período.',
          suggestion: 'Que tal começar adicionando seu primeiro ganho?'
        });
      } else {
        setNoIncomesMessage(null);
      }
    } catch (error) {
      console.error('Erro ao buscar ganhos:', error);
      setError('Erro ao carregar ganhos. Por favor, tente novamente.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIncomes(incomes.map(income => income.id));
    } else {
      setSelectedIncomes([]);
    }
  };

  const handleSelectIncome = (id, e) => {
    if (e.target.checked) {
      setSelectedIncomes(prev => [...prev, id]);
    } else {
      setSelectedIncomes(prev => prev.filter(incomeId => incomeId !== id));
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
  };

  const handleDeleteClick = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meus Ganhos</h1>
        <button onClick={() => navigate('/add-income')} className={sharedStyles.addButton}>
          <span className="material-icons">add</span>
          Novo Ganho
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedIncomes.length === incomes.length && incomes.length > 0}
                  onChange={handleSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Banco</th>
              <th>Tipo</th>
              <th>Recorrência</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr key={income.id} className={styles.tableRow}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIncomes.includes(income.id)}
                    onChange={(e) => handleSelectIncome(income.id, e)}
                    className={styles.checkbox}
                  />
                </td>
                <td>{income.description}</td>
                <td>R$ {income.amount.toFixed(2)}</td>
                <td>{formatDate(income.date)}</td>
                <td>{income.Category?.category_name}</td>
                <td>{income.Bank?.name}</td>
                <td>
                  {income.is_recurring ? (
                    <div className={styles.recurringInfo}>
                      <span className="material-icons" style={{ marginRight: '4px' }}>sync</span>
                      Fixo
                    </div>
                  ) : 'Único'}
                </td>
                <td>
                  {income.is_recurring ? (
                    <div className={styles.recurringInfo}>
                      {formatRecurrenceType(income.recurrence_type)}
                    </div>
                  ) : '-'}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleEditClick(income)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(income)}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
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

      {editingIncome && (
        <EditIncomeForm
          income={editingIncome}
          onSave={() => {
            setEditingIncome(null);
            fetchIncomes();
          }}
          onCancel={() => setEditingIncome(null)}
        />
      )}

      {showDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Excluir Ganho</h2>
            <p>Tem certeza que deseja excluir este ganho?</p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${incomeToDelete.id}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${auth.token}`
                      }
                    });

                    if (!response.ok) {
                      throw new Error('Erro ao excluir ganho');
                    }

                    setShowDeleteModal(false);
                    setIncomeToDelete(null);
                    fetchIncomes();
                    toast.success('Ganho excluído com sucesso!');
                  } catch (error) {
                    console.error('Erro ao excluir ganho:', error);
                    toast.error('Erro ao excluir ganho. Por favor, tente novamente.');
                  }
                }}
                className={styles.deleteButton}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incomes; 