import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/income.module.css';
import EditIncomeForm from './EditIncomeForm';

const EditRecurringIncomes = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingIncome, setEditingIncome] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchIncomes();
  }, [auth.token]);

  const fetchIncomes = async () => {
    try {
      // Busca ganhos recorrentes e parcelados
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar ganhos');
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      // Verifica se data.incomes existe, senão usa o próprio data
      const incomesData = data.incomes || data;
      
      // Filtra apenas ganhos que são recorrentes OU têm parcelas
      const filteredIncomes = incomesData.filter(income => 
        income.is_recurring || income.has_installments
      );
      
      // Agrupa os ganhos por recurring_group_id ou installment_group_id
      const groupedIncomes = filteredIncomes.reduce((acc, income) => {
        const groupId = income.recurring_group_id || income.installment_group_id;
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(income);
        return acc;
      }, {});

      // Para cada grupo, pega o ganho com a menor data
      const uniqueIncomes = Object.values(groupedIncomes)
        .filter(group => group.length > 0) // Filtra grupos vazios
        .map(group => {
          return group.reduce((earliest, current) => {
            const earliestDate = new Date(earliest.date);
            const currentDate = new Date(current.date);
            return currentDate < earliestDate ? current : earliest;
          });
        })
        .filter(income => income); // Remove undefined/null

      console.log('Ganhos únicos:', uniqueIncomes);
      setIncomes(uniqueIncomes);
      setLoading(false);
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao carregar ganhos. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const handleEditClick = (income) => {
    setSelectedIncome(income);
    setShowConfirmModal(true);
  };

  const handleDeleteClick = (income) => {
    setSelectedIncome(income);
    setShowDeleteModal(true);
  };

  const handleConfirmEdit = () => {
    setEditingIncome(selectedIncome);
    setShowConfirmModal(false);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${selectedIncome.id}?delete_all=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir receita');
      }

      setShowDeleteModal(false);
      setSelectedIncome(null);
      setSuccess('Receita excluída com sucesso!');
      await fetchIncomes();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Erro ao excluir receita. Por favor, tente novamente.');
    }
  };

  const handleUpdate = async (updatedIncome) => {
    try {
      console.log('Enviando atualização:', updatedIncome);
      
      // Garante que as datas estejam no formato correto
      const payload = {
        description: updatedIncome.description,
        amount: updatedIncome.amount,
        date: updatedIncome.date,
        category_id: updatedIncome.category_id,
        subcategory_id: updatedIncome.subcategory_id,
        bank_id: updatedIncome.bank_id,
        is_recurring: updatedIncome.is_recurring
      };

      // Adiciona as datas de início e fim se for recorrente
      if (updatedIncome.is_recurring) {
        // Garante que as datas sejam objetos Date válidos
        const startDate = new Date(updatedIncome.start_date);
        const endDate = new Date(updatedIncome.end_date);

        // Ajusta o horário para meio-dia para evitar problemas de timezone
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(12, 0, 0, 0);

        payload.start_date = startDate.toISOString();
        payload.end_date = endDate.toISOString();

        console.log('Datas ajustadas:', {
          start_date: payload.start_date,
          end_date: payload.end_date
        });
      }

      console.log('Payload da atualização:', payload);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/${updatedIncome.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar receita');
      }

      const data = await response.json();
      console.log('Resposta da atualização:', data);

      await fetchIncomes();
      setEditingIncome(null);
      setSuccess('Receita atualizada com sucesso!');
      setTimeout(() => {
        navigate('/income');
      }, 2000);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Editar Receitas Recorrentes</h1>
        <button 
          onClick={() => navigate('/income')}
          className={styles.backButton}
        >
          Voltar para Minhas Receitas
        </button>
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
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map(income => (
              <tr key={income.id}>
                <td>{income.description}</td>
                <td>R$ {income.amount.toFixed(2).replace('.', ',')}</td>
                <td>{new Date(income.date).toLocaleDateString()}</td>
                <td>{income.is_recurring ? 'Recorrente' : 'Parcelada'}</td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleEditClick(income)}
                      className={styles.editButton}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(income)}
                      className={styles.deleteButton}
                    >
                      Excluir
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
              Você está prestes a editar uma receita {selectedIncome.is_recurring ? 'recorrente' : 'parcelada'}.
              Esta ação irá atualizar todas as receitas futuras deste grupo.
              Deseja continuar?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedIncome(null);
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
              Você está prestes a excluir uma receita {selectedIncome.is_recurring ? 'recorrente' : 'parcelada'}.
              Esta ação irá excluir todas as receitas deste grupo.
              Esta ação não pode ser desfeita. Deseja continuar?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedIncome(null);
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

export default EditRecurringIncomes; 