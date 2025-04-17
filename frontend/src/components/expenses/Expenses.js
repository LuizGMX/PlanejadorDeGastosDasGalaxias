import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
import EditExpenseForm from './EditExpenseForm';
import { toast } from 'react-hot-toast';
import { 
  BsPlusLg, 
  BsCash, 
  BsCalendar3, 
  BsFilter, 
  BsSearch, 
  BsPencil, 
  BsTrash,   
  BsExclamationTriangle, 
  BsRepeat, 
  BsCurrencyDollar,
  BsX,
  BsCreditCard2Front,
  BsCashCoin,
  BsWallet2,
  BsFolderSymlink,
  BsChevronDown,
  BsChevronUp,
  BsArrowClockwise
} from 'react-icons/bs';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const Expenses = ({ 
  expenses, 
  categories, 
  banks, 
  loading, 
  error, 
  selectedExpenses, 
  onSelectExpense, 
  onSelectAll, 
  onDelete, 
  onEdit, 
  onAdd, 
  onFilter, 
  onSearch, 
  filters, 
  noExpensesMessage 
}) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { auth } = useContext(AuthContext);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });
  const [deleteOption, setDeleteOption] = useState(null);
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});

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

  const paymentMethods = [
    { value: 'all', label: 'Todos os Métodos' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'money', label: 'Dinheiro' }
  ];

  const installmentOptions = [
    { value: 'all', label: 'Todas as Despesas' },
    { value: 'yes', label: 'Apenas Parceladas' },
    { value: 'no', label: 'Apenas Não Parceladas' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll(`.${dataTableStyles.modernSelect}`);
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
    setOpenFilter(null);
    onFilter(type, value);
  };

  // Função auxiliar para verificar se uma despesa é ocorrência de recorrência
  const isRecurrenceOccurrence = (expense) => {
    return expense.isRecurringOccurrence === true || 
           (expense.is_recurring && expense.originalRecurrenceId) || 
           expense.isFilteredOriginalRecurrence;
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

  // Adaptando a função para usar o onSelectExpense do wrapper
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

    onSelectExpense(id);
  };

  const formatSelectedPeriod = (filterType) => {
    if (filterType === 'months') {
      if (!filters.months || filters.months.length === 0) {
        return 'Selecionar Mês';
      }
      if (filters.months.length === 1) {
        const monthLabel = months.find(m => m.value === filters.months[0])?.label;
        return monthLabel || 'Selecionar Mês';
      }
      return `${filters.months.length} meses selecionados`;
    } else if (filterType === 'years') {
      if (!filters.years || filters.years.length === 0) {
        return 'Selecionar Ano';
      }
      if (filters.years.length === 1) {
        return filters.years[0];
      }
      return `${filters.years.length} anos selecionados`;
    }
    return '';
  };

  const formatRecurrenceType = (type) => {
    const types = {
      'daily': 'Diária',
      'weekly': 'Semanal',
      'monthly': 'Mensal',
      'yearly': 'Anual',
      'biweekly': 'Quinzenal',
      'custom': 'Personalizada'
    };
    
    return types[type] || 'Desconhecido';
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setShowFilters(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleCardDetails = (id) => {
    setExpandedCardDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.loading}>Carregando...</p>
        </div>
      </div>
    );
  }

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
        <h1 className={dataTableStyles.pageTitle}>Minhas Despesas</h1>
        <button 
          onClick={() => navigate('/add-expense')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Nova Despesa
        </button>
      </div>

      <div className={dataTableStyles.dataContainer}>
        {isMobile && (
          <button 
            className={dataTableStyles.filterToggleButton} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <BsFilter size={16} /> 
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            {showFilters ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        )}

        <div className={`${dataTableStyles.filtersContainer} ${isMobile && !showFilters ? dataTableStyles.filtersCollapsed : ''} ${isMobile && showFilters ? dataTableStyles.filtersExpanded : ''}`}>
          {/* Renderização do filtro de período */}
          {/* ... (código do filtro de período) ... */}
        </div>

        {selectedExpenses.length > 0 && (
          <div className={dataTableStyles.bulkActions}>
            <button
              onClick={() => onDelete({ id: 'bulk' })}
              className={dataTableStyles.deleteButton}
            >
              <BsTrash /> Excluir {selectedExpenses.length} {selectedExpenses.length === 1 ? 'item' : 'itens'}
            </button>
          </div>
        )}

        {noExpensesMessage ? (
          <div className={dataTableStyles.noDataContainer}>
            <BsCash className={dataTableStyles.noDataIcon} />
            <h3 className={dataTableStyles.noDataMessage}>{noExpensesMessage.message}</h3>
            <p className={dataTableStyles.noDataSuggestion}>{noExpensesMessage.suggestion}</p>
          </div>
        ) : (
          <>
            {/* Renderização condicional baseada no dispositivo */}
            {isMobile ? (
              <>
                {/* Visualização em cards para mobile */}
                {/* ... (código para renderização de cards mobile) ... */}
              </>
            ) : (
              /* Visualização desktop */
              <div className={dataTableStyles.tableContainer}>
                <table className={dataTableStyles.table}>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedExpenses.length === expenses.length}
                          onChange={onSelectAll}
                        />
                      </th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Pagamento</th>
                      <th>Tipo</th>
                      <th>Parcelas</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={(e) => handleSelectExpense(expense.id, e)}
                          />
                        </td>
                        <td>{expense.description}</td>
                        <td>
                          <span className={dataTableStyles.expenseAmountBadge}>
                            {formatCurrency(expense.amount)}
                          </span>
                        </td>
                        <td>{formatDate(expense.expense_date)}</td>
                        <td>{expense.Category?.category_name}</td>
                        <td>{expense.payment_method}</td>
                        <td>
                          {expense.is_recurring ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                              <BsRepeat size={14} /> Fixo
                            </span>
                          ) : expense.has_installments ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentsType}`}>
                              <BsCreditCard2Front size={14} /> Parcelado
                            </span>
                          ) : (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCurrencyDollar size={14} /> Único
                            </span>
                          )}
                        </td>
                        <td>{expense.has_installments ? `${expense.current_installment}/${expense.total_installments}` : '-'}</td>
                        <td>
                          <div className={dataTableStyles.actionButtons}>
                            <button
                              onClick={() => onEdit(expense)}
                              className={dataTableStyles.editButton}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              onClick={() => onDelete(expense)}
                              className={dataTableStyles.deleteButton}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={`${dataTableStyles.modalContent} ${dataTableStyles.deleteModal}`}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle size={22} className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              {/* ... (código para confirmação de exclusão) ... */}
            </div>
            <div className={dataTableStyles.modalActions}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setExpenseToDelete(null);
                  setDeleteOption(null);
                }} 
                className={dataTableStyles.secondaryButton}
              >
                <BsX size={18} /> Cancelar
              </button>
              <button 
                onClick={() => {
                  if (expenseToDelete) {
                    onDelete(expenseToDelete);
                  }
                }}
                className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
              >
                <BsTrash size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onSave={onAdd}
          onCancel={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
};

export default Expenses;