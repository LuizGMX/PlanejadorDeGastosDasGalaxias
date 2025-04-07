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

const Income = ({ 
  incomes, 
  onEdit, 
  onDelete, 
  onAdd,
  onFilter,
  onSearch,
  selectedIncomes,
  onSelectIncome,
  onSelectAll,
  loading,
  error
}) => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
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
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});
  const [activeSwipeCard, setActiveSwipeCard] = useState(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);

  // Log do estado antes da renderização
  console.log('Income render:', { 
    incomesType: typeof incomes, 
    isArray: Array.isArray(incomes), 
    incomesLength: incomes?.length,
    loading,
    error,
    incomesData: incomes // Log dos dados completos
  });
  
  // Garantir que incomes seja um array
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  
  // Log após o tratamento dos dados
  console.log('Income safeIncomes:', {
    length: safeIncomes.length,
    data: safeIncomes
  });

  if (loading) {
    return (
      <div className={dataTableStyles.loadingContainer}>
        <div className={dataTableStyles.loadingText}>Carregando receitas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={dataTableStyles.errorContainer}>
        <div className={dataTableStyles.errorText}>Erro ao carregar receitas: {error}</div>
      </div>
    );
  }

  if (safeIncomes.length === 0) {
    return (
      <div className={dataTableStyles.noDataContainer}>
        <div className={dataTableStyles.noDataIcon}>💰</div>
        <h3 className={dataTableStyles.noDataMessage}>Nenhuma receita encontrada</h3>
        <p className={dataTableStyles.noDataSuggestion}>
          Comece adicionando sua primeira receita clicando no botão abaixo
        </p>
        <div className={dataTableStyles.noDataActions}>
          <button className={dataTableStyles.primaryButton} onClick={onAdd}>
            <BsPlusLg /> Adicionar Receita
          </button>
        </div>
      </div>
    );
  }

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
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '-';
    }
  };

  // Funções para manipular receitas
  const handleAddIncome = () => {
    onAdd();
  };

  const handleEditIncome = (income) => {
    onEdit(income);
  };

  const handleDeleteIncome = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (incomeToDelete) {
      onDelete(incomeToDelete);
      setShowDeleteModal(false);
      setIncomeToDelete(null);
    }
  };

  const handleSearch = (term) => {
    onSearch(term);
  };

  const handleFilter = () => {
    onFilter();
  };

  const handleSelectIncome = (id) => {
    onSelectIncome(id);
  };

  const handleSelectAll = () => {
    onSelectAll();
  };

  // Add useEffect for detecting mobile screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Em desktop, sempre mostrar filtros. Em mobile, esconder por padrão
      setShowFilters(!mobile);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array since we only want to set up the listener once

  // Função para alternar detalhes do cartão em visualização mobile
  const toggleCardDetails = (id) => {
    setExpandedCardDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Funções para controlar o movimento de swipe em dispositivos móveis
  const handleTouchStart = (id, e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
    setActiveSwipeCard(id);
  };

  const handleTouchMove = (id, e) => {
    if (activeSwipeCard === id) {
      setTouchCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (id) => {
    if (activeSwipeCard === id) {
      setActiveSwipeCard(null);
    }
  };

  // Função para renderizar cartões em visualização mobile
  const renderMobileCards = () => {
    console.log("Rendering mobile cards:", { 
      isMobile, 
      incomesLength: safeIncomes.length,
      noIncomesMessage 
    });
    
    if (safeIncomes.length === 0) {
      return (
        <div className={dataTableStyles.noDataContainer}>
          <BsCash className={dataTableStyles.noDataIcon} />
          <h3 className={dataTableStyles.noDataMessage}>
            {noIncomesMessage?.message || "Nenhum ganho encontrado para os filtros selecionados."}
          </h3>
          <p className={dataTableStyles.noDataSuggestion}>
            {noIncomesMessage?.suggestion || "Tente ajustar os filtros ou adicionar um novo ganho."}
          </p>
        </div>
      );
    }
    
    return (
      <div className={dataTableStyles.mobileCardView}>
        {console.log("Rendering mobile card view with", safeIncomes.length, "incomes")}
        {safeIncomes.map((income) => {
          const isSwipeActive = activeSwipeCard === income.id;

          return (
            <div 
              key={income.id} 
              className={`${dataTableStyles.mobileCard} ${isSwipeActive ? dataTableStyles.mobileCardSwipeActive : ''}`}
              onTouchStart={(e) => handleTouchStart(income.id, e)}
              onTouchMove={(e) => handleTouchMove(income.id, e)}
              onTouchEnd={() => handleTouchEnd(income.id)}
            >
              <div className={dataTableStyles.mobileCardSwipeState}>
                {!income.is_recurring && (
                  <div className={dataTableStyles.mobileCardSelect}>
                    <label className={dataTableStyles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={selectedIncomes.includes(income.id)}
                        onChange={(e) => handleSelectIncome(income.id, e)}
                        className={dataTableStyles.checkbox}
                      />
                      <span className={dataTableStyles.checkmark}></span>
                    </label>
                  </div>
                )}
                
                <div className={dataTableStyles.mobileCardHeader}>
                  <h3 className={dataTableStyles.mobileCardTitle}>{income.description}</h3>
                  <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.incomeAmount} ${dataTableStyles.mobileCardAmount}`}>
                    {formatCurrency(income.amount)}
                  </span>
                </div>
                
                <div className={dataTableStyles.mobileCardDetails}>
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Data</span>
                    <span className={dataTableStyles.mobileCardValue}>{formatDate(income.date)}</span>
                  </div>
                  
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Categoria</span>
                    <span className={dataTableStyles.mobileCardValue}>
                      <BsFolderSymlink style={{color: 'var(--primary-color)'}} />
                      {income.Category?.category_name || '-'}
                    </span>
                  </div>
                  
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Banco</span>
                    <span className={dataTableStyles.mobileCardValue}>
                      <BsBank2 style={{color: 'var(--primary-color)'}} />
                      {income.Bank?.name || '-'}
                    </span>
                  </div>
                  
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Tipo</span>
                    <span className={dataTableStyles.mobileCardValue}>
                      {income.is_recurring ? (
                        <><BsRepeat style={{color: 'var(--primary-color)'}} /> Receita fixa</>
                      ) : (
                        <><BsCurrencyDollar style={{color: 'var(--text-color)'}} /> Receita única</>
                      )}
                    </span>
                  </div>
                </div>
                
                <div className={dataTableStyles.mobileCardActions}>
                  <div className={dataTableStyles.mobileCardType}>
                    {income.is_recurring ? (
                      <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                        <BsRepeat /> Fixo
                      </span>
                    ) : (
                      <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                        <BsCurrencyDollar /> Único
                      </span>
                    )}
                  </div>
                  
                  <div className={dataTableStyles.mobileCardActionButtons}>
                    <button 
                      onClick={() => handleEditIncome(income)} 
                      className={dataTableStyles.actionButton}
                      title="Editar"
                    >
                      <BsPencil />
                    </button>
                    <button 
                      onClick={() => handleDeleteIncome(income)} 
                      className={`${dataTableStyles.actionButton} ${dataTableStyles.delete}`}
                      title="Excluir"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={dataTableStyles.pageContainer}>
      {console.log("Rendering Income component:", {
        isMobile,
        showFilters,
        incomesCount: safeIncomes.length,
        loading,
        hasError: !!error,
        showNoIncomesMessage: !!noIncomesMessage
      })}
      <div className={dataTableStyles.pageHeader}>
        <h1 className={dataTableStyles.pageTitle}>Receitas</h1>
        <button 
          onClick={() => navigate('/add-income')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Adicionar
        </button>
      </div>

      <div className={dataTableStyles.dataContainer}>
        {isMobile && (
          <button 
            className={dataTableStyles.filterToggleButton} 
            onClick={() => {
              console.log("Toggling filters from", showFilters, "to", !showFilters);
              setShowFilters(!showFilters);
            }}
          >
            <BsFilter size={16} /> 
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            {showFilters ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        )}

        <div className={`${dataTableStyles.filtersContainer} ${isMobile && !showFilters ? dataTableStyles.filtersCollapsed : ''} ${isMobile && showFilters ? dataTableStyles.filtersExpanded : ''}`} style={isMobile ? { display: showFilters ? 'flex' : 'none', flexDirection: 'column' } : {}}>
          {deleteSuccess && (
            <div className={dataTableStyles.successMessage}>
              {deleteSuccess.message} {deleteSuccess.count > 1 ? `(${deleteSuccess.count} itens)` : ''}
            </div>
          )}

          <div className={dataTableStyles.filterRow}>
            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsSearch /> Buscar
              </label>
              <div className={dataTableStyles.searchField}>
                <input
                  type="text"
                  className={dataTableStyles.searchInput}
                  placeholder="Buscar receitas..."
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={dataTableStyles.tableContainer}>
          <table className={dataTableStyles.table}>
            <thead>
              <tr>
                <th>
                  <div className={dataTableStyles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={selectedIncomes.length === safeIncomes.length}
                      onChange={handleSelectAll}
                    />
                    <span className={dataTableStyles.checkmark}></span>
                  </div>
                </th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Categoria</th>
                <th>Banco</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {safeIncomes.map((income) => (
                <tr key={income.id}>
                  <td>
                    <div className={dataTableStyles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={selectedIncomes.includes(income.id)}
                        onChange={() => handleSelectIncome(income.id)}
                      />
                      <span className={dataTableStyles.checkmark}></span>
                    </div>
                  </td>
                  <td>{income.description}</td>
                  <td>
                    <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.incomeAmount}`}>
                      {formatCurrency(income.amount)}
                    </span>
                  </td>
                  <td>{formatDate(income.date)}</td>
                  <td>{income.Category?.category_name || '-'}</td>
                  <td>{income.Bank?.name || '-'}</td>
                  <td>
                    <span className={`${dataTableStyles.typeStatus} ${income.is_recurring ? dataTableStyles.fixedType : dataTableStyles.oneTimeType}`}>
                      {income.is_recurring ? 'Fixa' : 'Única'}
                    </span>
                  </td>
                  <td>
                    <div className={dataTableStyles.actionButtons}>
                      <button
                        className={dataTableStyles.editButton}
                        onClick={() => handleEditIncome(income)}
                      >
                        <BsPencil />
                      </button>
                      <button
                        className={dataTableStyles.deleteButton}
                        onClick={() => handleDeleteIncome(income)}
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
      </div>
    </div>
  );
};

export default Income;