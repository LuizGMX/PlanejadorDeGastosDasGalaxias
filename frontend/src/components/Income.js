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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 768);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});
  const [activeSwipeCard, setActiveSwipeCard] = useState(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obter um token válido, tentando primeiro o contexto e depois localStorage
        let token = auth.token;
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage...');
          token = localStorage.getItem('token');
          if (!token) {
            console.error('Nenhum token de autenticação encontrado');
            navigate('/login');
            return;
          }
        }
        
        // Fazer as requisições para categorias e bancos
        const categoriesPromise = fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const banksPromise = fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/favorites`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Esperar as respostas
        const [categoriesResponse, banksResponse] = await Promise.all([
          categoriesPromise,
          banksPromise
        ]);
        
        // Processar a resposta das categorias
        const categoriesText = await categoriesResponse.text();
        if (categoriesText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta de categorias contém HTML. Possível erro 502.');
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        // Processar a resposta dos bancos
        const banksText = await banksResponse.text();
        if (banksText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta de bancos contém HTML. Possível erro 502.');
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        // Verificar se as respostas foram bem-sucedidas
        if (!categoriesResponse.ok || !banksResponse.ok) {
          throw new Error('Erro ao carregar dados');
        }
        
        // Parsear os dados como JSON
        let categoriesData, banksData;
        try {
          categoriesData = JSON.parse(categoriesText);
          banksData = JSON.parse(banksText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }

        setCategories(categoriesData);
        setBanks(banksData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error.message || 'Erro ao carregar dados. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, navigate]);

  const fetchIncomes = async () => {
    try {
      console.log('Fetching incomes with filters:', filters);
      const queryParams = new URLSearchParams();
      
      // Adiciona meses e anos como arrays
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      // Adiciona outros filtros
      if (filters.category_id) queryParams.append('category_id', filters.category_id);
      if (filters.description) queryParams.append('description', filters.description);
      if (filters.is_recurring !== '') queryParams.append('is_recurring', filters.is_recurring);

      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para fetchIncomes...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para fetchIncomes');
          navigate('/login');
          return;
        }
      }

      const url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes?${queryParams}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.log('Unauthorized, redirecting to login');
        navigate('/login');
        return;
      }
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        let errorMessage = 'Erro ao carregar receitas';
        try {
          // Parsear o JSON manualmente já que usamos text() acima
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Se não puder parsear como JSON, usar o texto de status
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Parsear o JSON manualmente já que usamos text() acima
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      console.log('Received data structure:', {
        hasIncomes: !!data.incomes,
        incomesIsArray: Array.isArray(data.incomes),
        incomesLength: data.incomes ? data.incomes.length : 0,
        metadata: data.metadata,
        incomesSample: data.incomes && data.incomes.length > 0 ? data.incomes[0] : null
      });
      
      // Adiciona verificação para garantir que os objetos relacionados existam
      const incomesData = (data.incomes || []).map(income => ({
        ...income,
        Category: income.Category || {},
        Bank: income.Bank || {}
      }));
      
      setIncomes(incomesData);
      console.log('Set incomes:', incomesData.length, 'items');
      setSelectedIncomes([]);
      setMetadata(data.metadata || { filters: { categories: [], recurring: [] }, total: 0 });

      // Define a mensagem quando não há receitas
      if (!incomesData || incomesData.length === 0) {
        console.log('No incomes found, setting message');
        // Verifica se há filtros ativos
        const hasActiveFilters = filters.months.length !== 1 || 
                                filters.years.length !== 1 || 
                                filters.category_id !== '' || 
                                filters.description !== '' || 
                                filters.is_recurring !== '';

        setNoIncomesMessage(hasActiveFilters ? {
          message: 'Nenhum ganho encontrado para os filtros selecionados.',
          suggestion: 'Tente ajustar os filtros para ver mais resultados.'
        } : {
          message: 'Você ainda não tem receitas cadastradas para este período.',
          suggestion: 'Que tal começar adicionando seu primeiro ganho?'
        });
      } else {
        setNoIncomesMessage(null);
      }
    } catch (err) {
      console.error('Error fetching incomes:', err);
      setError('Erro ao carregar receitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, [auth.token, filters, navigate]);

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
      console.log("Resize detected: Window width =", window.innerWidth, "isMobile =", mobile);
      setIsMobile(mobile);
      if (!mobile) {
        setShowFilters(true);
      }
    };
    
    // Execute imediatamente para definir o estado inicial
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      incomesLength: incomes.length,
      noIncomesMessage 
    });
    
    if (incomes.length === 0) {
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
        {console.log("Rendering mobile card view with", incomes.length, "incomes")}
        {incomes.map((income) => {
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
              
              <div className={dataTableStyles.mobileCardSwipeActions}>
                <div 
                  className={dataTableStyles.mobileCardSwipeEdit}
                  onClick={() => handleEditIncome(income)}
                >
                  <BsPencil size={20} />
                </div>
                <div 
                  className={dataTableStyles.mobileCardSwipeDelete}
                  onClick={() => handleDeleteIncome(income)}
                >
                  <BsTrash size={20} />
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
        incomesCount: incomes.length,
        loading,
        hasError: !!error,
        showNoIncomesMessage: !!noIncomesMessage
      })}
      <div className={dataTableStyles.pageHeader}>
        <h1 className={dataTableStyles.pageTitle}>Meus Receitas</h1>
        <button 
          onClick={() => navigate('/add-income')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Novo Ganho
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
                <BsCalendar3 /> Meses
              </label>
              <div 
                className={`${dataTableStyles.modernSelect} ${openFilter === 'months' ? dataTableStyles.active : ''}`}
                onClick={() => handleFilterClick('months')}
              >
                <div className={dataTableStyles.modernSelectHeader}>
                  <span>
                    {filters.months.length === 0 
                      ? 'Nenhum mês selecionado' 
                      : filters.months.length === 1 
                        ? months.find(m => m.value === filters.months[0])?.label 
                        : filters.months.length === months.length 
                          ? 'Todos os meses' 
                          : `${filters.months.length} meses selecionados`}
                  </span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'months' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.months.length === months.length}
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
                            checked={filters.months.includes(month.value)}
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
                    {filters.years.length === 0 
                      ? 'Nenhum ano selecionado' 
                      : filters.years.length === 1 
                        ? filters.years[0] 
                        : filters.years.length === years.length 
                          ? 'Todos os anos' 
                          : `${filters.years.length} anos selecionados`}
                  </span>
                  <span className={dataTableStyles.arrow}>▼</span>
                </div>
                {openFilter === 'years' && (
                  <div className={dataTableStyles.modernSelectDropdown}>
                    <label className={dataTableStyles.modernCheckboxLabel} onClick={handleCheckboxClick}>
                      <div className={dataTableStyles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.years.length === years.length}
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
                            checked={filters.years.includes(year.value)}
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

            {/* ... resto dos filtros ... */}
          </div>
        </div>

        {/* ... resto do componente ... */}
      </div>
    </div>
  );
};

export default Income;