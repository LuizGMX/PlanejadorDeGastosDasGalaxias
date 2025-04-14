import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Expenses from './Expenses';
import MobileExpenses from './MobileExpenses';
import styles from '../../styles/shared.module.css';
import '../../styles/dataTable.module.css';
import { toast } from 'react-hot-toast';

const ExpensesWrapper = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category: 'all',
    paymentMethod: 'all',
    hasInstallments: 'all',
    description: '',
    is_recurring: ''
  });
  const [originalExpenses, setOriginalExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
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

  // Funções para manipular despesas
  const handleAddExpense = () => {
    navigate('/add-expense');
  };

  const handleEditExpense = (expense) => {
    navigate(`/expenses/edit/${expense.id}`);
  };

  const handleDeleteExpense = async (expense) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir despesa');
      }

      const data = await response.json();
      toast.success(data.message);
      await fetchData(filters);
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
      toast.error('Erro ao excluir despesa');
    }
  };

  const handleSearch = (term) => {
    console.log('Searching for:', term);
    setSearchTerm(term);
    
    // Atualizar o termo de busca e aplicar filtros no backend
    setTimeout(() => {
      const backendFilters = {
        month: filters.months !== 'all' ? filters.months : undefined,
        year: filters.years !== 'all' ? filters.years : undefined,
        category_id: filters.category !== 'all' ? filters.category : undefined,
        bank_id: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
        is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
        description: term || undefined
      };
      
      fetchData(backendFilters);
    }, 0);
  };

  const handleFilter = (type, value) => {
    console.log('Applying filter for expenses:', type, value, typeof value);
    
    // Caso especial para resetar todos os filtros
    if (type === 'resetAllFilters' && value === true) {
      console.log('Resetting all filters for expenses - showing all data');
      
      // Resetar o estado dos filtros para valores padrão
      const resetFilters = {
        months: [],
        years: [],
        category: 'all',
        paymentMethod: 'all',
        hasInstallments: 'all',
        description: '',
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
      
      console.log('Novos filtros para despesas:', newFilters);
      
      // Buscar dados com os novos filtros após atualizar o estado
      setTimeout(() => {
        // Converter filtros internos para o formato da API
        const backendFilters = {
          months: newFilters.months,
          years: newFilters.years,
          description: newFilters.description || undefined,
          category: newFilters.category !== 'all' ? newFilters.category : undefined,
          paymentMethod: newFilters.paymentMethod !== 'all' ? newFilters.paymentMethod : undefined,
          hasInstallments: newFilters.hasInstallments !== 'all' ? newFilters.hasInstallments : undefined,
          is_recurring: newFilters.is_recurring !== '' ? newFilters.is_recurring : undefined
        };
        
        console.log('Filtros enviados para a API de despesas:', backendFilters);
        fetchData(backendFilters);
      }, 0);
      
      return newFilters;
    });
  };

  const handleSelectExpense = (id) => {
    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expId => expId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenses.map(exp => exp.id));
    }
  };

  // Efeito para carregar dados
  useEffect(() => {
    console.log('ExpensesWrapper - Carregando dados iniciais');
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();
    
    // Definir filtros iniciais
    setFilters({
      months: [thisMonth],
      years: [thisYear],
      category: 'all',
      paymentMethod: 'all',
      hasInstallments: 'all',
      description: '',
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
      
      if (filterParams.category && filterParams.category !== 'all') {
        queryParams.append('category_id', filterParams.category);
      }
      
      if (filterParams.bank && filterParams.bank !== 'all') {
        queryParams.append('bank_id', filterParams.bank);
      }
      
      if (filterParams.hasInstallments && filterParams.hasInstallments !== 'all') {
        queryParams.append('has_installments', filterParams.hasInstallments === 'yes');
      }
      
      if (filterParams.paymentMethod && filterParams.paymentMethod !== 'all') {
        queryParams.append('payment_method', filterParams.paymentMethod);
      }
      
      if (filterParams.is_recurring !== undefined && filterParams.is_recurring !== '') {
        queryParams.append('is_recurring', filterParams.is_recurring);
      }
      
      // Construir a URL com query params
      const queryString = queryParams.toString();
      const url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses${queryString ? `?${queryString}` : ''}`;
      
      console.log('URL da requisição:', url);
      
      // Buscar despesas com os filtros
      const expensesResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      console.log('Resposta da API de despesas:', {
        status: expensesResponse.status,
        ok: expensesResponse.ok,
        statusText: expensesResponse.statusText
      });
      
      if (!expensesResponse.ok) {
        throw new Error('Erro ao carregar despesas');
      }
      
      const expensesData = await expensesResponse.json();
      console.log('Dados de despesas recebidos:', {
        type: typeof expensesData,
        isArray: Array.isArray(expensesData),
        length: expensesData?.length,
        sample: expensesData?.length > 0 ? expensesData[0] : null
      });
      
      // Extração dos dados de despesas
      let extractedExpenses = [];
      
      if (Array.isArray(expensesData)) {
        extractedExpenses = expensesData;
      } else {
        console.error('Formato de dados inesperado:', expensesData);
        extractedExpenses = [];
      }
      
      console.log('Despesas extraídas:', {
        length: extractedExpenses.length,
        sample: extractedExpenses.length > 0 ? extractedExpenses[0] : null
      });
      
      setOriginalExpenses(extractedExpenses);
      setFilteredExpenses(extractedExpenses);
      setExpenses(extractedExpenses);
      
      // Exibe os dados antes de aplicar filtros
      console.log("Dados carregados antes de filtros:", extractedExpenses.length);
      
      // Examine alguns dados para debug
      if (extractedExpenses.length > 0) {
        console.log("Exemplo de despesa:", extractedExpenses[0]);
        console.log("Data da despesa:", extractedExpenses[0].date);
        console.log("Formato da data:", typeof extractedExpenses[0].date);
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
      setOriginalExpenses([]);
      setFilteredExpenses([]);
      setExpenses([]);
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
      category_id: filters.category !== 'all' ? filters.category : undefined,
      bank_id: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
      is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
      description: searchTerm || undefined
    };
    
    console.log('Aplicando filtros no backend:', backendFilters);
    
    // Buscar dados com filtros
    await fetchData(backendFilters);
  };

  // Log do estado antes da renderização
  console.log('ExpensesWrapper render:', {
    expensesLength: expenses.length,
    loading,
    error,
    isMobile
  });

  // Renderização condicional baseada no dispositivo
  return isMobile ? (
    <MobileExpenses
      expenses={expenses}
      onEdit={handleEditExpense}
      onDelete={handleDeleteExpense}
      onAdd={handleAddExpense}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedExpenses={selectedExpenses}
      onSelectExpense={handleSelectExpense}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
      categories={categories}
      banks={banks}
      filters={filters}
    />
  ) : (
    <Expenses
      expenses={expenses}
      onEdit={handleEditExpense}
      onDelete={handleDeleteExpense}
      onAdd={handleAddExpense}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedExpenses={selectedExpenses}
      onSelectExpense={handleSelectExpense}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
    />
  );
};

export default ExpensesWrapper; 