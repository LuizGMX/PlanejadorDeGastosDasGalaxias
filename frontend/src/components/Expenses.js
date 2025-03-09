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
  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single', // 'single', 'forward', 'backward', 'all'
    installmentGroupId: null
  });
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });

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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    fetchExpenses();
  }, [auth.token, filter]);

  const fetchExpenses = async () => {
    try {
      const queryParams = new URLSearchParams({
        month: filter.month,
        year: filter.year
      }).toString();

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
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
          <label>Mês</label>
          <select
            name="month"
            value={filter.month}
            onChange={handleFilterChange}
            className={styles.select}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Ano</label>
          <select
            name="year"
            value={filter.year}
            onChange={handleFilterChange}
            className={styles.select}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
