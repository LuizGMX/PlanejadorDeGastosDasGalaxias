import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/expenses.module.css';
import EditExpenseForm from './EditExpenseForm';

const EditRecurringExpenses = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [auth.token]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar despesas');
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      // Verifica se data.expenses existe, senão usa o próprio data
      const expensesData = data.expenses || data;
      
      // Filtra despesas recorrentes e parceladas
      const filteredExpenses = expensesData.filter(expense => 
        expense.is_recurring || expense.has_installments
      );
      
      // Agrupa as despesas por recurring_group_id ou installment_group_id
      const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
        const groupId = expense.recurring_group_id || expense.installment_group_id;
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(expense);
        return acc;
      }, {});

      // Para cada grupo, pega apenas a primeira despesa (a mais antiga)
      const uniqueExpenses = Object.values(groupedExpenses)
        .filter(group => group.length > 0)
        .map(group => {
          return group.reduce((earliest, current) => {
            const earliestDate = new Date(earliest.expense_date);
            const currentDate = new Date(current.expense_date);
            return currentDate < earliestDate ? current : earliest;
          });
        });

      console.log('Despesas únicas:', uniqueExpenses);
      setExpenses(uniqueExpenses);
      setLoading(false);
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao carregar despesas. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const handleEditClick = (expense) => {
    setSelectedExpense(expense);
    setShowConfirmModal(true);
  };

  const handleDeleteClick = (expense) => {
    setSelectedExpense(expense);
    setShowDeleteModal(true);
  };

  const handleConfirmEdit = () => {
    setEditingExpense(selectedExpense);
    setShowConfirmModal(false);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${selectedExpense.id}?delete_all=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir despesa');
      }

      setShowDeleteModal(false);
      setSelectedExpense(null);
      setSuccess('Despesa excluída com sucesso!');
      await fetchExpenses();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Erro ao excluir despesa. Por favor, tente novamente.');
    }
  };

  const handleUpdate = async (updatedExpense) => {
    try {
      console.log('Enviando atualização:', updatedExpense);
      
      // Garante que as datas estejam no formato correto
      const payload = {
        description: updatedExpense.description,
        amount: updatedExpense.amount,
        expense_date: updatedExpense.expense_date,
        category_id: updatedExpense.category_id,
        subcategory_id: updatedExpense.subcategory_id,
        bank_id: updatedExpense.bank_id,
        payment_method: updatedExpense.payment_method,
        is_recurring: updatedExpense.is_recurring,
        start_date: updatedExpense.start_date,
        end_date: updatedExpense.end_date
      };

      console.log('Payload da atualização:', payload);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${updatedExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar despesa');
      }

      const data = await response.json();
      console.log('Resposta da atualização:', data);

      await fetchExpenses();
      setEditingExpense(null);
      setSuccess('Despesa atualizada com sucesso!');
      setTimeout(() => {
        navigate('/expenses');
      }, 2000);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar despesa. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 style={{color: '#00FF85'}}>Editar Despesas Recorrentes</h1>
        {/* <button 
          onClick={() => navigate('/expenses')}
          className={styles.backButton}
        >
          Voltar para Minhas Despesas
        </button> */}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Banco/Carteira</th>
              <th>Método de Pagamento</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id}>
                <td data-label="Descrição">{expense.description}</td>
                <td data-label="Valor">R$ {Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td data-label="Data">
                  {expense.is_recurring 
                    ? `${new Date(expense.start_date).toLocaleDateString('pt-BR')} até ${new Date(expense.end_date).toLocaleDateString('pt-BR')}`
                    : new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                </td>
                <td data-label="Categoria">{expense.category_name}</td>
                <td data-label="Subcategoria">{expense.subcategory_name || '-'}</td>
                <td data-label="Banco/Carteira">{expense.bank_name}</td>
                <td data-label="Método de Pagamento">
                  {
                    {
                      'credit_card': 'Cartão de Crédito',
                      'debit_card': 'Cartão de Débito',
                      'money': 'Dinheiro',
                      'pix': 'PIX',
                      'transfer': 'Transferência',
                      'other': 'Outro'
                    }[expense.payment_method]
                  }
                </td>
                <td data-label="Tipo">{expense.is_recurring ? 'Recorrente' : 'Parcelado'}</td>
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

      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Atenção!</h3>
            <p>
              Você está prestes a editar uma despesa recorrente.
              Esta ação irá atualizar todas as despesas futuras deste grupo.
              Deseja continuar?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedExpense(null);
                }}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEdit}
                className={styles.confirmButton}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Atenção!</h3>
            <p>
              Você está prestes a excluir uma despesa recorrente.
              Esta ação irá excluir todas as despesas deste grupo.
              Esta ação não pode ser desfeita. Deseja continuar?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedExpense(null);
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
    </div>
  );
};

export default EditRecurringExpenses; 