import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import '../styles/mobile/dataTable.mobile.css';
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

const Income = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [selectedIncomes, setSelectedIncomes] = useState([]);
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
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return '-';
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const nonRecurringIncomes = incomes
        .filter(income => !income.is_recurring)
        .map(income => income.id);
      setSelectedIncomes(nonRecurringIncomes);
    } else {
      setSelectedIncomes([]);
    }
  };

  const handleSelectIncome = (id, event) => {
    const income = incomes.find(i => i.id === id);
    if (income?.is_recurring) {
      const rect = event.target.getBoundingClientRect();
      setMessagePosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 5
      });
      setShowInstallmentMessage(true);
      setTimeout(() => setShowInstallmentMessage(false), 3000);
      return;
    }

    setSelectedIncomes(prev => {
      if (prev.includes(id)) {
        return prev.filter(incomeId => incomeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDelete = async (income) => {
    if (income.is_recurring) {
      setIncomeToDelete(income);
      setDeleteOptions({
        type: 'recurring',
        showModal: true,
        options: [
          { id: 'all', label: 'Excluir todos os receitas fixos (passados e futuros)' },
          { id: 'past', label: 'Excluir somente receitas fixos passados' },
          { id: 'future', label: 'Excluir somente receitas fixos futuros' }
        ],
        message: 'Para excluir um ganho fixo específico, encontre-o na lista de receitas do mês desejado.'
      });
      return;
    }
    try {
      if (deleteOptions.type === 'bulk') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/bulk`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({ ids: selectedIncomes })
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir receitas');
        }

        const data = await response.json();

        // Limpa os estados do modal
        setShowDeleteModal(false);
        setIncomeToDelete(null);
        setDeleteOptions({ type: 'single' });
        setSelectedIncomes([]);

        // Mostra mensagem de sucesso
        setDeleteSuccess({
          message: data.message,
          count: data.count
        });

        // Remove a mensagem após 3 segundos
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);

        // Recarrega a lista de receitas
        await fetchIncomes();
        return;
      }

      let url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${income.id}`;
      if (deleteOption) {
        url += `?deleteOption=${deleteOption}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir ganho');
      }

      const data = await response.json();

      // Limpa os estados do modal
      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setDeleteOption(null);

      // Mostra mensagem de sucesso
      setDeleteSuccess({
        message: data.message,
        count: 1
      });

      // Remove a mensagem após 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      // Recarrega a lista de receitas
      await fetchIncomes();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      setError('Erro ao excluir ganho(s)');
    }
  };

  const handleDeleteClick = (income = null) => {
    if (income) {
      setIncomeToDelete(income);
      setDeleteOption('single');
      
      if (income.is_recurring) {
        setDeleteOptions({
          type: 'single'
        });
      } else {
        setDeleteOptions({
          type: 'single'
        });
      }
    } else {
      setIncomeToDelete(null);
      setDeleteOption(null);
      setDeleteOptions({
        type: 'bulk',
        ids: selectedIncomes
      });
    }
    setShowDeleteModal(true);
  };

  const handleUpdate = async (updatedIncome) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${updatedIncome.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(updatedIncome)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar ganho');
      }

      setEditingIncome(null);
      await fetchIncomes();
    } catch (error) {
      setError('Erro ao atualizar ganho. Por favor, tente novamente.');
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
  };

  const handleSave = async (incomeData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${incomeData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(incomeData)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      setEditingIncome(null);
      // Atualiza a lista de receitas após a edição
      const updatedIncomes = incomes.map(income => 
        income.id === incomeData.id ? incomeData : income
      );
      setIncomes(updatedIncomes);
      toast.success('Receita atualizada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar receita');
    }
  };

  const handleDeleteConfirm = async (option) => {
    try {
      if (!incomeToDelete) return;
      setIsDeleting(true);

      let url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${incomeToDelete.id}`;
      const queryParams = new URLSearchParams();

      if (incomeToDelete.is_recurring) {
        switch (option) {
          case 'all':
            queryParams.append('delete_all', 'true');
            break;
          case 'past':
            queryParams.append('delete_past', 'true');
            queryParams.append('reference_date', incomeToDelete.date);
            break;
          case 'future':
            queryParams.append('delete_future', 'true');
            queryParams.append('reference_date', incomeToDelete.date);
            break;
          default:
            break;
        }

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir receita');
      }

      setShowDeleteModal(false);
      setIncomeToDelete(null);
      await fetchIncomes();
      toast.success('Receita(s) excluída(s) com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir receita');
    } finally {
      setIsDeleting(false);
    }
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
                  <span className={`