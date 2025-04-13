import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Income from './Income';
import MobileIncomes from './MobileIncomes';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';

const IncomesWrapper = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    description: '',
    category_id: '',
    is_recurring: ''
  });
  const [originalIncomes, setOriginalIncomes] = useState([]);
  const [filteredIncomes, setFilteredIncomes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Função para verificar se a tela é mobile
  const isMobileView = () => {
    return window.innerWidth <= 768;
  };

  // Estado para controlar se é mobile
  const [isMobile, setIsMobile] = useState(isMobileView());
  
  // Efeito para monitorar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileView());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Funções para manipular receitas
  const handleAddIncome = () => {
    navigate('/add-income');
  };

  const handleEditIncome = (income) => {
    navigate(`/incomes/edit/${income.id}`);
  };

  const handleDeleteIncome = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const handleSearch = (term) => {
    console.log('Searching for:', term);
    setSearchTerm(term);
    
    // Atualizar o termo de busca e aplicar filtros no backend
    setTimeout(() => {
      const backendFilters = {
        month: filters.months !== 'all' ? filters.months : undefined,
        year: filters.years !== 'all' ? filters.years : undefined,
        category_id: filters.category_id !== 'all' ? filters.category_id : undefined,
        bank_id: filters.bank_id !== 'all' ? filters.bank_id : undefined,
        is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
        description: term || undefined
      };
      
      fetchData(backendFilters);
    }, 0);
  };

  const handleFilter = (type, value) => {
    console.log('Applying filter for incomes:', type, value, typeof value);
    
    // Caso especial para resetar todos os filtros
    if (type === 'resetAllFilters' && value === true) {
      console.log('Resetting all filters for incomes - showing all data');
      
      // Resetar o estado dos filtros para valores padrão
      const resetFilters = {
        months: [],
        years: [],
        description: '',
        category_id: 'all',
        bank_id: 'all',
        is_recurring: ''
      };
      
      setFilters(resetFilters);
      
      // Buscar todos os dados sem filtros
      fetchData(resetFilters);
      return;
    }
    
    // Atualizar o estado do filtro e depois buscar os dados
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };
      
      // Atualizar o valor do filtro específico
      newFilters[type] = value;
      
      console.log('Novos filtros para receitas:', newFilters);
      
      // Buscar dados com os novos filtros após atualizar o estado
      setTimeout(() => {
        // Converter filtros internos para o formato da API
        const backendFilters = {
          months: newFilters.months,
          years: newFilters.years,
          description: newFilters.description || undefined,
          category_id: newFilters.category_id !== 'all' ? newFilters.category_id : undefined,
          bank_id: newFilters.bank_id !== 'all' ? newFilters.bank_id : undefined,
          is_recurring: newFilters.is_recurring !== '' ? newFilters.is_recurring : undefined
        };
        
        console.log('Filtros enviados para a API de receitas:', backendFilters);
        fetchData(backendFilters);
      }, 0);
      
      return newFilters;
    });
  };

  const handleSelectIncome = (id) => {
    setSelectedIncomes(prev => {
      if (prev.includes(id)) {
        return prev.filter(incId => incId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    // Garantir que incomes seja um array
    const safeIncomes = Array.isArray(incomes) ? incomes : [];
    
    if (selectedIncomes.length === safeIncomes.length) {
      setSelectedIncomes([]);
    } else {
      setSelectedIncomes(safeIncomes.map(inc => inc.id));
    }
  };

  // Efeito para carregar dados
  useEffect(() => {
    console.log('IncomesWrapper - Carregando dados iniciais');
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();
    
    // Definir filtros iniciais
    setFilters({
      months: [thisMonth],
      years: [thisYear],
      description: '',
      category_id: 'all',
      bank_id: 'all',
      is_recurring: ''
    });
    
    // Buscar dados com os filtros iniciais
    fetchData({
      months: [thisMonth],
      years: [thisYear]
    });
  }, [auth.token]);

  const fetchData = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // Construir os parâmetros da query
      const queryParams = new URLSearchParams();
      
      // Adicionar os parâmetros de filtro à URL
      if (filterParams.months && filterParams.months.length > 0) {
        filterParams.months.forEach(month => queryParams.append('months[]', month));
      }
      
      if (filterParams.years && filterParams.years.length > 0) {
        filterParams.years.forEach(year => queryParams.append('years[]', year));
      }
      
      if (filterParams.description) {
        queryParams.append('description', filterParams.description);
      }
      
      if (filterParams.category_id && filterParams.category_id !== 'all') {
        queryParams.append('category_id', filterParams.category_id);
      }
      
      if (filterParams.bank_id && filterParams.bank_id !== 'all') {
        queryParams.append('bank_id', filterParams.bank_id);
      }
      
      if (filterParams.is_recurring !== undefined && filterParams.is_recurring !== '') {
        queryParams.append('is_recurring', filterParams.is_recurring);
      }
      
      // Construir a URL com query params
      const queryString = queryParams.toString();
      const url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes${queryString ? `?${queryString}` : ''}`;
      
      console.log('URL da requisição:', url);
      
      // Buscar receitas com os filtros
      const incomesResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      console.log('Resposta da API de receitas:', {
        status: incomesResponse.status,
        ok: incomesResponse.ok,
        statusText: incomesResponse.statusText
      });
      
      if (!incomesResponse.ok) {
        throw new Error('Erro ao carregar receitas');
      }
      
      const incomesData = await incomesResponse.json();
      console.log('Dados de receitas recebidos:', {
        type: typeof incomesData,
        isArray: Array.isArray(incomesData),
        length: incomesData?.length,
        data: incomesData
      });
      
      // Extrair os dados de receitas do objeto retornado
      let extractedIncomes = [];
      
      // Verificar se é um objeto e contém a propriedade 'incomes'
      if (typeof incomesData === 'object' && 'incomes' in incomesData) {
        extractedIncomes = incomesData.incomes;
      } else if (Array.isArray(incomesData)) {
        extractedIncomes = incomesData;
      } else {
        console.error('Formato de dados inesperado:', incomesData);
        extractedIncomes = [];
      }
      
      console.log('Receitas extraídas:', {
        length: extractedIncomes.length,
        data: extractedIncomes
      });
      
      setOriginalIncomes(extractedIncomes);
      setFilteredIncomes(extractedIncomes);
      setIncomes(extractedIncomes);
      
      // Exibe os dados antes de aplicar filtros
      console.log("Dados carregados antes de filtros:", extractedIncomes.length);
      
      // Examine alguns dados para debug
      if (extractedIncomes.length > 0) {
        console.log("Exemplo de receita:", extractedIncomes[0]);
        console.log("Data da receita:", extractedIncomes[0].date);
        console.log("Formato da data:", typeof extractedIncomes[0].date);
      }

      // Buscar categorias
      const categoriesResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/categories`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (!categoriesResponse.ok) {
        throw new Error('Erro ao carregar categorias');
      }
      
      const categoriesData = await categoriesResponse.json();
      console.log('Dados de categorias recebidos:', {
        type: typeof categoriesData,
        isArray: Array.isArray(categoriesData),
        data: categoriesData
      });
      
      // Extrair os dados de categorias do objeto retornado
      let extractedCategories = [];
      
      if (typeof categoriesData === 'object' && !Array.isArray(categoriesData)) {
        if (categoriesData.data && Array.isArray(categoriesData.data)) {
          extractedCategories = categoriesData.data;
        } else if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
          extractedCategories = categoriesData.categories;
        } else if (categoriesData.items && Array.isArray(categoriesData.items)) {
          extractedCategories = categoriesData.items;
        } else {
          // Tentar encontrar qualquer propriedade que seja um array
          for (const key in categoriesData) {
            if (Array.isArray(categoriesData[key])) {
              extractedCategories = categoriesData[key];
              console.log(`Encontrado array de categorias na propriedade '${key}'`);
              break;
            }
          }
        }
      } else if (Array.isArray(categoriesData)) {
        extractedCategories = categoriesData;
      }
      
      console.log('Categorias extraídas:', {
        length: extractedCategories.length,
        data: extractedCategories
      });
      
      setCategories(extractedCategories);

      // Buscar bancos
      const banksResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (!banksResponse.ok) {
        throw new Error('Erro ao carregar bancos');
      }
      
      const banksData = await banksResponse.json();
      console.log('Dados de bancos recebidos:', {
        type: typeof banksData,
        isArray: Array.isArray(banksData),
        data: banksData
      });
      
      // Extrair os dados de bancos do objeto retornado
      let extractedBanks = [];
      
      if (typeof banksData === 'object' && !Array.isArray(banksData)) {
        if (banksData.data && Array.isArray(banksData.data)) {
          extractedBanks = banksData.data;
        } else if (banksData.banks && Array.isArray(banksData.banks)) {
          extractedBanks = banksData.banks;
        } else if (banksData.items && Array.isArray(banksData.items)) {
          extractedBanks = banksData.items;
        } else {
          // Tentar encontrar qualquer propriedade que seja um array
          for (const key in banksData) {
            if (Array.isArray(banksData[key])) {
              extractedBanks = banksData[key];
              console.log(`Encontrado array de bancos na propriedade '${key}'`);
              break;
            }
          }
        }
      } else if (Array.isArray(banksData)) {
        extractedBanks = banksData;
      }
      
      console.log('Bancos extraídos:', {
        length: extractedBanks.length,
        data: extractedBanks
      });
      
      setBanks(extractedBanks);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error.message);
      setOriginalIncomes([]);
      setFilteredIncomes([]);
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros no backend
  const applyFilters = async () => {
    // Mapear os filtros do estado para o formato que o backend espera
    const backendFilters = {
      month: filters.months !== 'all' ? filters.months : undefined,
      year: filters.years !== 'all' ? filters.years : undefined,
      category_id: filters.category_id !== 'all' ? filters.category_id : undefined,
      bank_id: filters.bank_id !== 'all' ? filters.bank_id : undefined,
      is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
      description: searchTerm || undefined
    };
    
    console.log('Aplicando filtros no backend:', backendFilters);
    
    // Buscar dados com filtros
    await fetchData(backendFilters);
  };

  // Log do estado antes da renderização
  console.log('IncomesWrapper render:', {
    incomesLength: incomes.length,
    loading,
    error,
    isMobile
  });

  // Renderização condicional baseada no dispositivo
  return isMobile ? (
    <MobileIncomes
      incomes={incomes}
      onEdit={handleEditIncome}
      onDelete={handleDeleteIncome}
      onAdd={handleAddIncome}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedIncomes={selectedIncomes}
      onSelectIncome={handleSelectIncome}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
      categories={categories}
      banks={banks}
      filters={filters}
    />
  ) : (
    <Income
      incomes={incomes}
      onEdit={handleEditIncome}
      onDelete={handleDeleteIncome}
      onAdd={handleAddIncome}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedIncomes={selectedIncomes}
      onSelectIncome={handleSelectIncome}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
      categories={categories}
      banks={banks}
      filters={filters}
    />
  );
};

export default IncomesWrapper; 