import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import { 
  BsPlusLg, 
  BsCash, 
  BsFilter, 
  BsSearch, 
  BsPencil, 
  BsTrash, 
  BsBank2, 
  BsExclamationTriangle, 
  BsRepeat, 
  BsCurrencyDollar,
  BsFolderSymlink,
  BsChevronDown,
  BsChevronUp,
  BsCalendar3,
  BsArrowClockwise
} from 'react-icons/bs';

function Income({ 
  incomes, 
  onEdit, 
  onDelete, 
  onAdd,
  onFilter,
  onSearch,
  onSelectIncome,
  onSelectAll,
  loading,
  error,
  categories,
  banks,
  filters,
  noIncomesMessage
}) {
  
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [openFilter, setOpenFilter] = useState(null); 
  
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});
  const [activeSwipeCard, setActiveSwipeCard] = useState(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  
  const safeFilters = filters || {
    months: [],
    years: [],
    category_id: 'all',
    is_recurring: '',
    description: ''
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
  }, []);

  // Log para monitorar as mudanças nos filtros
  useEffect(() => {
    console.log('Filtros atualizados em Income.js:', safeFilters);
  }, [safeFilters]);

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
  
  // Função para verificar se uma receita é uma ocorrência de uma receita recorrente
  const isRecurrenceOccurrence = (income) => {
    return income.isRecurringOccurrence === true;
  };
  
  // Separar receitas normais das ocorrências de receitas recorrentes
  const normalIncomes = safeIncomes.filter(income => !isRecurrenceOccurrence(income));
  const recurrenceOccurrences = safeIncomes.filter(isRecurrenceOccurrence);
  
  // Log após o tratamento dos dados
  console.log('Income safeIncomes:', {
    total: safeIncomes.length,
    normalIncomes: normalIncomes.length,
    recurrenceOccurrences: recurrenceOccurrences.length,
    data: safeIncomes
  });

  // Funções para manipular receitas
  const handleAddIncome = () => {
    onAdd();
  };

  const handleEditIncome = (income) => {
    onEdit(income);
  };

  const handleDeleteIncome = (income) => {
    // Chamar diretamente a função onDelete para usar a confirmação
    // implementada no IncomesWrapper
    onDelete(income);
  };

  const handleSearch = (term) => {
    console.log('Termo de busca:', term);
    setSearchTerm(term);
    
    // Cancela o timeout anterior se existir
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Define um novo timeout para enviar a busca após 300ms
    const timeout = setTimeout(() => {
      console.log('Enviando termo de busca para o componente pai:', term);
      onSearch(term);
    }, 300);
    
    setSearchTimeout(timeout);
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

  // Lista de anos para o filtro
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: 11 },
    (_, i) => ({
      value: currentYear - 5 + i,
      label: (currentYear - 5 + i).toString()
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

  // Efeito para fechar os dropdowns quando clicar fora deles
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Encontre todos os elementos com a classe modernSelect
      const selectElements = document.querySelectorAll(`.${dataTableStyles.modernSelect}`);
      
      // Verifica se o clique foi fora de todos os elementos modernSelect
      const isOutside = ![...selectElements].some(el => el.contains(event.target));
      
      if (isOutside && openFilter) {
        console.log('Clique fora do dropdown, fechando:', openFilter);
        setOpenFilter(null);
      }
    };
    
    // Adiciona o listener ao documento
    document.addEventListener('mousedown', handleClickOutside);
    
    // Remove o listener quando o componente é desmontado
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openFilter]);

  const handleFilterClick = (filterType) => {
    console.log('Clicando no filtro:', filterType);
    
    // Prevenção de cliques acidentais muito rápidos
    const now = Date.now();
    if (lastClickTime && now - lastClickTime < 200) {
      return; // Ignora cliques muito rápidos
    }
    
    // Atualiza o tempo do último clique
    setLastClickTime(now);
    
    // Se clicar no mesmo filtro que já está aberto, fecha-o
    if (openFilter === filterType) {
      setOpenFilter(null);
    } else {
      // Caso contrário, abre o novo filtro
      setOpenFilter(filterType);
    }
  };

  const handleCheckboxClick = (e) => {
    console.log('Checkbox clicado:', e.target.checked);
    e.stopPropagation();
  };

  const handleFilterChange = (type, value) => {
    console.log('handleFilterChange em Income.js:', type, value);
    
    if (type === 'description') {
      // Atualiza o searchTerm local e envia para o componente pai
      setSearchTerm(value);
      onSearch(value);
      return;
    }
    
    // Tratamentos especiais para meses e anos que são arrays
    if (type === 'months') {
      // Se o valor já existe no array, remova-o, caso contrário adicione-o
      const updatedMonths = safeFilters.months.includes(value)
        ? safeFilters.months.filter(month => month !== value)
        : [...safeFilters.months, value];
      
      console.log('Atualizando meses:', { atual: safeFilters.months, novo: updatedMonths });
      onFilter(type, updatedMonths);
      return;
    }
    
    if (type === 'years') {
      // Se o valor já existe no array, remova-o, caso contrário adicione-o
      const updatedYears = safeFilters.years.includes(value)
        ? safeFilters.years.filter(year => year !== value)
        : [...safeFilters.years, value];
        
      console.log('Atualizando anos:', { atual: safeFilters.years, novo: updatedYears });
      onFilter(type, updatedYears);
      return;
    }
    
    // Para outros tipos (category_id, is_recurring, etc.), use o valor diretamente
    onFilter(type, value);
  };

  const formatSelectedPeriod = (type) => {
    switch(type) {
      case 'months':
        if (!safeFilters?.months?.length) return 'Selecione o mês';
        if (safeFilters.months.length === 1) {
          const selectedMonth = months.find(m => m.value === safeFilters.months[0]);
          return selectedMonth ? selectedMonth.label : 'Selecione o mês';
        }
        if (safeFilters.months.length > 2) {
          return `${safeFilters.months.length} meses selecionados`;
        }
        return safeFilters.months
          .map(m => months.find(month => month.value === m)?.label)
          .filter(Boolean)
          .join(', ');
          
      case 'years':
        if (!safeFilters?.years?.length) return 'Selecione o ano';
        if (safeFilters.years.length === 1) {
          return safeFilters.years[0].toString();
        }
        if (safeFilters.years.length > 2) {
          return `${safeFilters.years.length} anos selecionados`;
        }
        return safeFilters.years.join(', ');
        
      case 'category':
        if (!safeFilters?.category_id || safeFilters.category_id === 'all') {
          return 'Todas as categorias';
        }
        const selectedCategory = categories.find(c => c.id.toString() === safeFilters.category_id);
        return selectedCategory ? selectedCategory.category_name : 'Selecione a categoria';
        
      default:
        return "Filtro aplicado";
    }
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

  // Função para renderizar cartões em visualização mobile
  const renderMobileCards = () => {
    console.log("Rendering mobile cards:", { 
      isMobile, 
      incomesLength: safeIncomes.length,
      noIncomesMessage 
    });
    
    return (
      <>
        {safeIncomes.length === 0 || noIncomesMessage ? (
          <div className={dataTableStyles.noDataContainer}>
            <BsCash className={dataTableStyles.noDataIcon} />
            <h3 className={dataTableStyles.noDataMessage}>
              {noIncomesMessage?.message || "Nenhuma receita encontrada para os filtros selecionados."}
            </h3>
            <p className={dataTableStyles.noDataSuggestion}>
              {noIncomesMessage?.suggestion || "Tente ajustar os filtros ou adicionar uma nova receita."}
            </p>
            <div className={dataTableStyles.noDataActions}>
              <button className={dataTableStyles.primaryButton} onClick={onAdd}>
                <BsPlusLg /> Adicionar Receita
              </button>
            </div>
          </div>
        ) : (
          <div className={dataTableStyles.mobileCardView}>
            {console.log("Rendering mobile card view with", safeIncomes.length, "incomes")}
            {safeIncomes.map((income) => (
              <div 
                key={income.id} 
                className={dataTableStyles.mobileCard}
              >
                {/* {!income.is_recurring && (
                  <div className={dataTableStyles.mobileCardSelect}>
                    <label className={dataTableStyles.checkboxContainer}>
                      <input
                        type="checkbox"
                        checked={selectedIncomes.includes(income.id)}
                        onChange={() => handleSelectIncome(income.id)}
                        className={dataTableStyles.checkbox}
                      />
                      <span className={dataTableStyles.checkmark}></span>
                    </label>
                  </div>
                )} */}
                
                <div className={dataTableStyles.mobileCardHeader}>
                  <h3 className={dataTableStyles.mobileCardTitle}>{income.description}</h3>
                  <span className={`${dataTableStyles.incomeAmountBadge} ${dataTableStyles.incomeAmount} ${dataTableStyles.mobileCardAmount}`}>
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
                      {income.bank?.name || '-'}
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
            ))}
          </div>
        )}
      </>
    );
  };

  // Limpa o timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
          onClick={handleAddIncome} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Adicionar
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

        <div className={`${dataTableStyles.filtersContainer} ${isMobile && !showFilters ? dataTableStyles.filtersCollapsed : ''}`}>
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
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsCalendar3 /> Período
              </label>
              <div
                className={`${dataTableStyles.modernSelect} ${openFilter === 'months' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('months')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>{formatSelectedPeriod('months')}</span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'months' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    {months.map((month) => (
                      <label 
                        key={month.value} 
                        className={dataTableStyles.modernCheckboxLabel}
                        onClick={() => {
                          handleFilterChange('months', month.value);
                          handleCheckboxClick({ target: { checked: !safeFilters?.months?.includes(month.value) }, stopPropagation: () => {} });
                        }}
                      >
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="checkbox"
                            className={dataTableStyles.hiddenCheckbox}
                            checked={safeFilters?.months?.includes(month.value)}
                            onChange={() => {}} // Manipulado pelo onClick do label
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        {month.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsCalendar3 /> Ano
              </label>
              <div
                className={`${dataTableStyles.modernSelect} ${openFilter === 'years' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('years')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>{formatSelectedPeriod('years')}</span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'years' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    {years.map((year) => (
                      <label 
                        key={year.value} 
                        className={dataTableStyles.modernCheckboxLabel}
                        onClick={() => {
                          handleFilterChange('years', year.value);
                          handleCheckboxClick({ target: { checked: !safeFilters?.years?.includes(year.value) }, stopPropagation: () => {} });
                        }}
                      >
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="checkbox"
                            className={dataTableStyles.hiddenCheckbox}
                            checked={safeFilters?.years?.includes(year.value)}
                            onChange={() => {}} // Manipulado pelo onClick do label
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        {year.label}
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
                  <span>{formatSelectedPeriod('category')}</span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'category' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label 
                      className={dataTableStyles.modernCheckboxLabel}
                      onClick={() => {
                        handleFilterChange('category_id', 'all');
                        setOpenFilter(null); // Fechar o dropdown após a seleção
                      }}
                    >
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="radio"
                          className={dataTableStyles.hiddenCheckbox}
                          checked={!safeFilters.category_id || safeFilters.category_id === 'all'}
                          onChange={() => {}} // Manipulado pelo onClick do label
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className={dataTableStyles.customCheckbox}></div>
                      </div>
                      Todas as categorias
                    </label>
                    {categories && categories.length > 0 && categories.map((category) => (
                      <label 
                        key={category.id} 
                        className={dataTableStyles.modernCheckboxLabel}
                        onClick={() => {
                          handleFilterChange('category_id', category.id.toString());
                          setOpenFilter(null); // Fechar o dropdown após a seleção
                        }}
                      >
                        <div className={dataTableStyles.modernCheckbox}>
                          <input
                            type="radio"
                            className={dataTableStyles.hiddenCheckbox}
                            checked={safeFilters.category_id === category.id.toString()}
                            onChange={() => {}} // Manipulado pelo onClick do label
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={dataTableStyles.customCheckbox}></div>
                        </div>
                        {category.category_name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className={dataTableStyles.filterGroup}>
              <label className={dataTableStyles.filterLabel}>
                <BsRepeat /> Tipo
              </label>
              <div className={dataTableStyles.toggleGroup}>
                <button
                  className={`${dataTableStyles.recurringButton} ${safeFilters.is_recurring === '' ? dataTableStyles.active : ''}`}
                  onClick={() => handleFilterChange('is_recurring', '')}
                >
                  <BsArrowClockwise /> Todos
                </button>
                <button
                  className={`${dataTableStyles.recurringButton} ${safeFilters.is_recurring === true ? dataTableStyles.active : ''}`}
                  onClick={() => handleFilterChange('is_recurring', true)}
                >
                  <BsRepeat /> Fixos
                </button>
                <button
                  className={`${dataTableStyles.recurringButton} ${safeFilters.is_recurring === false ? dataTableStyles.active : ''}`}
                  onClick={() => handleFilterChange('is_recurring', false)}
                >
                  <BsCurrencyDollar /> Únicos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* {selectedIncomes.length > 0 && (
          <div className={dataTableStyles.bulkActions}>
            <button 
              onClick={handleConfirmDelete} 
              className={dataTableStyles.deleteButton}
            >
              <BsTrash /> Excluir {selectedIncomes.length} {selectedIncomes.length === 1 ? 'item' : 'itens'}
            </button>
          </div>
        )} */}

        {isMobile ? (
          renderMobileCards()
        ) : (
          <>
            {safeIncomes.length === 0 || noIncomesMessage ? (
              <div className={dataTableStyles.noDataContainer}>
                <BsCash className={dataTableStyles.noDataIcon} />
                <h3 className={dataTableStyles.noDataMessage}>
                  {noIncomesMessage?.message || "Nenhuma receita encontrada para os filtros selecionados."}
                </h3>
                <p className={dataTableStyles.noDataSuggestion}>
                  {noIncomesMessage?.suggestion || "Tente ajustar os filtros ou adicionar uma nova receita."}
                </p>
                <div className={dataTableStyles.noDataActions}>
                  <button className={dataTableStyles.primaryButton} onClick={onAdd}>
                    <BsPlusLg /> Adicionar Receita
                  </button>
                </div>
              </div>
            ) : (
              <div className={dataTableStyles.tableContainer}>
                <table className={dataTableStyles.table}>
                  <thead>
                    <tr>
                      {/* <th>
                        <div className={dataTableStyles.checkboxContainer}>
                          <input
                            type="checkbox"
                            checked={selectedIncomes.length === safeIncomes.length}
                            onChange={handleSelectAll}
                          />
                          <span className={dataTableStyles.checkmark}></span>
                        </div>
                      </th> */}
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
                        {/* <td>
                          <div className={dataTableStyles.checkboxContainer}>
                            <input
                              type="checkbox"
                              checked={selectedIncomes.includes(income.id)}
                              onChange={() => handleSelectIncome(income.id)}
                            />
                            <span className={dataTableStyles.checkmark}></span>
                          </div>
                        </td> */}
                        <td>{income.description}</td>
                        <td>
                          <span className={`${dataTableStyles.incomeAmountBadge} ${dataTableStyles.incomeAmount}`}>
                            {formatCurrency(income.amount)}
                          </span>
                        </td>
                        <td>{formatDate(income.date)}</td>
                        <td>{income.Category?.category_name || '-'}</td>
                        <td>{income.bank?.name || '-'}</td>
                        <td>
                          <span className={`${dataTableStyles.typeStatus} ${income.is_recurring ? dataTableStyles.fixedType : dataTableStyles.oneTimeType}`}>
                            {income.is_recurring ? (
                              <><BsRepeat size={14} /> Fixa</>
                            ) : (
                              <><BsCurrencyDollar size={14} /> Única</>
                            )}
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Income;