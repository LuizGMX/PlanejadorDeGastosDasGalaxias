import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import dataTableStyles from '../styles/dataTable.module.css';
import EditIncomeForm from './EditIncomeForm';
import { 
  BsArrowLeft, 
  BsPencil, 
  BsTrash, 
  BsRepeat, 
  BsCurrencyDollar,
  BsCalendar3,
  BsX,
  BsExclamationTriangle,
  BsCheck2,
  BsPlus,
  BsFolderSymlink,
  BsBank2,
  BsListCheck
} from 'react-icons/bs';

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
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar receitas');
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      // Verifica se data.incomes existe, senão usa o próprio data
      const incomesData = data.incomes || data;
      
      // Filtra apenas receitas que são recorrentes OU têm parcelas
      const filteredIncomes = incomesData.filter(income => 
        income.is_recurring || income.has_installments
      );
      
      // Agrupa os receitas por recurring_group_id ou installment_group_id
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
        .filter(group => group.length > 0)
        .map(group => {
          return group.reduce((earliest, current) => {
            const earliestDate = new Date(earliest.date);
            const currentDate = new Date(current.date);
            return currentDate < earliestDate ? current : earliest;
          });
        });

      console.log('Receitas únicos:', uniqueIncomes);
      setIncomes(uniqueIncomes);
      setLoading(false);
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao carregar receitas. Por favor, tente novamente.');
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${selectedIncome.id}?delete_all=true`, {
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

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${updatedIncome.id}`, {
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
    <div className={dataTableStyles.container}>
      <div className={dataTableStyles.header}>
        <div className={dataTableStyles.headerTitleContainer}>
          <BsRepeat size={24} className={dataTableStyles.headerIcon} />
          <h2>Receitas Fixos</h2>
        </div>
        <button 
          onClick={() => navigate('/income')}
          className={dataTableStyles.backButton}
        >
          <BsArrowLeft /> Voltar
        </button>
      </div>

      {loading ? (
        <div className={dataTableStyles.loadingContainer}>
          <div className={dataTableStyles.loadingSpinner}></div>
          <p>Carregando receitas fixos...</p>
        </div>
      ) : error ? (
        <div className={dataTableStyles.errorContainer}>
          <BsExclamationTriangle size={24} />
          <p>{error}</p>
        </div>
      ) : incomes.length === 0 ? (
        <div className={dataTableStyles.emptyContainer}>
          <p>Nenhum ganho fixo encontrado.</p>
          <button
            onClick={() => navigate('/add-income')}
            className={dataTableStyles.primaryButton}
          >
            <BsPlus /> Adicionar Ganho Fixo
          </button>
        </div>
      ) : (
        <>
          <div className={dataTableStyles.tableContainer}>
            <table className={dataTableStyles.table}>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Data inicial</th>
                  <th>Data final</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map(income => (
                  <tr key={income.id}>
                    <td data-label="Descrição">{income.description}</td>
                    <td data-label="Valor">
                      <span className={dataTableStyles.valuePositive}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income.amount)}
                      </span>
                    </td>
                    <td data-label="Data inicial">
                      <div className={dataTableStyles.cellWithIcon}>
                        <BsCalendar3 /> 
                        {new Date(income.start_date || income.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td data-label="Data final">
                      {income.end_date ? (
                        <div className={dataTableStyles.cellWithIcon}>
                          <BsCalendar3 />
                          {new Date(income.end_date).toLocaleDateString('pt-BR')}
                        </div>
                      ) : '-'}
                    </td>
                    <td data-label="Categoria">
                      <div className={dataTableStyles.cellWithIcon}>
                        <BsFolderSymlink />
                        {income.category_name || '-'}
                      </div>
                    </td>
                    <td data-label="Tipo">
                      <div className={dataTableStyles.fixedBadge}>
                        <BsRepeat /> Fixo
                      </div>
                    </td>
                    <td data-label="Ações">
                      <div className={dataTableStyles.actionButtons}>
                        <button
                          onClick={() => handleEditClick(income)}
                          className={dataTableStyles.editButton}
                          title="Editar"
                        >
                          <BsPencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(income)}
                          className={dataTableStyles.deleteButton}
                          title="Excluir"
                        >
                          <BsTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingIncome && (
        <EditIncomeForm
          income={editingIncome}
          onSave={handleUpdate}
          onCancel={() => setEditingIncome(null)}
        />
      )}

      {showDeleteModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={`${dataTableStyles.modalContent} ${dataTableStyles.deleteModal}`}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle size={22} className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            
            <div className={dataTableStyles.modalBody}>
              <div className={dataTableStyles.confirmMessage}>
                <p>Você está prestes a excluir o ganho fixo:</p>
                <p><strong>{selectedIncome?.description}</strong> - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedIncome?.amount)}</p>
                <p className={dataTableStyles.warningText}>Esta ação excluirá todas as ocorrências e não pode ser desfeita.</p>
              </div>
            </div>
            
            <div className={dataTableStyles.modalActions}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedIncome(null);
                }}
                className={dataTableStyles.secondaryButton}
              >
                <BsX size={18} /> Cancelar
              </button>
              <button
                onClick={handleDelete}
                className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
              >
                <BsTrash size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={dataTableStyles.modalContent}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle size={22} className={dataTableStyles.warningIcon} />
              <h3>Confirmar edição</h3>
            </div>
            
            <div className={dataTableStyles.modalBody}>
              <div className={dataTableStyles.confirmMessage}>
                <p>Você está prestes a aplicar alterações a um ganho fixo.</p>
                <p className={dataTableStyles.warningText}>Todas as ocorrências futuras deste ganho serão atualizadas.</p>
              </div>
              
              <div className={dataTableStyles.optionsContainer}>
                <div className={dataTableStyles.optionHeader}>
                  <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                    <BsRepeat size={14} /> Receita fixa mensal
                  </div>
                </div>
                <div className={dataTableStyles.warningText} style={{padding: '10px'}}>
                  Deseja continuar?
                </div>
              </div>
            </div>
            
            <div className={dataTableStyles.modalActions}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedIncome(null);
                }}
                className={dataTableStyles.secondaryButton}
              >
                <BsX size={18} /> Cancelar
              </button>
              <button
                onClick={handleConfirmEdit}
                className={dataTableStyles.primaryButton}
              >
                <BsCheck2 size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRecurringIncomes; 