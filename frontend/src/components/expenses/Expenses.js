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
  selectedExpenses = [], 
  onSelectExpense, 
  onSelectAll, 
  onDelete, 
  onEdit, 
  onAdd, 
  onFilter, 
  onSearch, 
  filters = {
    months: [],
    years: []
  }, 
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
  const [openFilter, setOpenFilter] = useState(null);

  // Garantir que filters.months e filters.years sejam arrays
  const filtersMonths = Array.isArray(filters.months) ? filters.months : [];
  const filtersYears = Array.isArray(filters.years) ? filters.years : [];

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
    
    if (type === 'months') {
      if (value === 'all') {
        // Se o valor for 'all', alternar entre todos os meses ou nenhum
        const allMonths = filtersMonths.length === months.length ? [] : months.map(m => m.value);
        onFilter(type, allMonths);
      } else {
        // Alternar a seleção do mês (adicionar ou remover)
        const updatedMonths = [...filtersMonths];
        const index = updatedMonths.indexOf(value);
        
        if (index >= 0) {
          // Se já estiver selecionado, remover
          updatedMonths.splice(index, 1);
        } else {
          // Se não estiver selecionado, adicionar
          updatedMonths.push(value);
        }
        
        onFilter(type, updatedMonths);
      }
    } else if (type === 'years') {
      if (value === 'all') {
        // Se o valor for 'all', alternar entre todos os anos ou nenhum
        const allYears = filtersYears.length === years.length ? [] : years.map(y => y.value);
        onFilter(type, allYears);
      } else {
        // Alternar a seleção do ano (adicionar ou remover)
        const updatedYears = [...filtersYears];
        const index = updatedYears.indexOf(value);
        
        if (index >= 0) {
          // Se já estiver selecionado, remover
          updatedYears.splice(index, 1);
        } else {
          // Se não estiver selecionado, adicionar
          updatedYears.push(value);
        }
        
        onFilter(type, updatedYears);
      }
    } else {
      // Para outros tipos de filtros, comportamento padrão
      onFilter(type, value);
    }
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
      if (!filtersMonths || filtersMonths.length === 0) {
        return 'Selecionar Mês';
      }
      if (filtersMonths.length === 1) {
        const monthLabel = months.find(m => m.value === filtersMonths[0])?.label;
        return monthLabel || 'Selecionar Mês';
      }
      return `${filtersMonths.length} meses selecionados`;
    } else if (filterType === 'years') {
      if (!filtersYears || filtersYears.length === 0) {
        return 'Selecionar Ano';
      }
      if (filtersYears.length === 1) {
        return filtersYears[0];
      }
      return `${filtersYears.length} anos selecionados`;
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

  // Procurando a estrutura dos filtros e da busca na tela de despesas
  const filterRowContent = (
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
              {filtersMonths.length === 0 
                ? 'Nenhum mês selecionado' 
                : filtersMonths.length === 1 
                  ? months.find(m => m.value === filtersMonths[0])?.label 
                  : filtersMonths.length === months.length 
                    ? 'Todos os meses' 
                    : `${filtersMonths.length} meses selecionados`}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'months' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                <div className={dataTableStyles.modernCheckbox}>
                  <input
                    type="checkbox"
                    checked={filtersMonths.length === months.length}
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
                      checked={filtersMonths.includes(month.value)}
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
              {filtersYears.length === 0 
                ? 'Nenhum ano selecionado' 
                : filtersYears.length === 1 
                  ? filtersYears[0] 
                  : filtersYears.length === years.length 
                    ? 'Todos os anos' 
                    : `${filtersYears.length} anos selecionados`}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'years' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                <div className={dataTableStyles.modernCheckbox}>
                  <input
                    type="checkbox"
                    checked={filtersYears.length === years.length}
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
                      checked={filtersYears.includes(year.value)}
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
              {filters.category === 'all' 
                ? 'Todas as categorias' 
                : categories.find(c => c.id?.toString() === filters.category)?.category_name || 'Selecione uma categoria'}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'category' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              <label 
                className={dataTableStyles.modernCheckboxLabel}
                onClick={(e) => {
                  e.preventDefault(); // Prevent default to ensure proper handling
                  handleFilterChange('category', 'all');
                  setOpenFilter(null); // Close dropdown after selection
                }}
              >
                <div className={dataTableStyles.modernCheckbox}>
                  <input
                    type="radio"
                    checked={filters.category === 'all'}
                    className={dataTableStyles.hiddenCheckbox}
                    onChange={() => handleFilterChange('category', 'all')}
                    name="category"
                  />
                  <div className={dataTableStyles.customCheckbox}></div>
                </div>
                <span>Todas as categorias</span>
              </label>
              {categories.map(category => (
                <label 
                  key={category.id} 
                  className={dataTableStyles.modernCheckboxLabel}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to ensure proper handling
                    handleFilterChange('category', category.id.toString());
                    setOpenFilter(null); // Close dropdown after selection
                  }}
                >
                  <div className={dataTableStyles.modernCheckbox}>
                    <input
                      type="radio"
                      checked={filters.category === category.id.toString()}
                      className={dataTableStyles.hiddenCheckbox}
                      onChange={() => handleFilterChange('category', category.id.toString())}
                      name="category"
                    />
                    <div className={dataTableStyles.customCheckbox}></div>
                  </div>
                  <span>{category.category_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={dataTableStyles.filterGroup}>
        <label className={dataTableStyles.filterLabel}>
          <BsWallet2 /> Método de Pagamento
        </label>
        <div 
          className={`${dataTableStyles.modernSelect} ${openFilter === 'paymentMethod' ? dataTableStyles.active : ''}`}
          onClick={() => handleFilterClick('paymentMethod')}
        >
          <div className={dataTableStyles.modernSelectHeader}>
            <span>
              {paymentMethods.find(m => m.value === filters.paymentMethod)?.label || 'Método de Pagamento'}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'paymentMethod' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              {paymentMethods.map(method => (
                <label 
                  key={method.value} 
                  className={dataTableStyles.modernCheckboxLabel}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to ensure proper handling
                    handleFilterChange('paymentMethod', method.value);
                    setOpenFilter(null); // Close dropdown after selection
                  }}
                >
                  <div className={dataTableStyles.modernCheckbox}>
                    <input
                      type="radio"
                      checked={filters.paymentMethod === method.value}
                      className={dataTableStyles.hiddenCheckbox}
                      onChange={() => handleFilterChange('paymentMethod', method.value)}
                      name="paymentMethod"
                    />
                    <div className={dataTableStyles.customCheckbox}></div>
                  </div>
                  <span>{method.label}</span>
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
              value={filters.description || ''} 
              onChange={(e) => handleFilterChange('description', e.target.value)} 
              className={dataTableStyles.searchInput}
            />
          </div>
        </div>
        
        <button
          className={`${dataTableStyles.recurringButton} ${filters.is_recurring === 'true' ? dataTableStyles.active : ''}`}
          onClick={() => handleFilterChange('is_recurring', filters.is_recurring === 'true' ? '' : 'true')}
          title="Mostrar apenas despesas fixas"
          style={{ alignSelf: 'flex-end' }}
        >
          <BsRepeat /> Fixos
        </button>
      </div>
    </div>
  );

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
          {filterRowContent}
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
                            checked={Array.isArray(selectedExpenses) && selectedExpenses.includes(expense.id)}
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