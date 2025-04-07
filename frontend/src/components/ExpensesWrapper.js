import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Expenses from './Expenses';
import MobileExpenses from './mobile/MobileExpenses';
import '../styles/dataTable.module.css';

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

  const handleDeleteExpense = (expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const handleSearch = (term) => {
    console.log('Searching for:', term);
    setSearchTerm(term);
    filterExpenses(term);
  };

  const handleFilter = (type, value) => {
    console.log('Applying filter:', type, value, typeof value);
    
    // Atualizar o estado do filtro
    setFilters(prev => {
      const newFilters = { ...prev, [type]: value };
      console.log('New filters state:', newFilters);
      return newFilters;
    });
    
    // Aplicar filtros aos dados
    let filtered = [...originalExpenses];
    console.log('Starting filtering with', filtered.length, 'expenses');
    
    // Filtrar por termo de busca, se existir
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.Category?.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.Bank?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search term filter:', filtered.length, 'expenses');
    }
    
    // Aplicar filtros adicionais
    if (type === 'category' && value !== 'all') {
      filtered = filtered.filter(expense => expense.category_id === parseInt(value, 10));
      console.log('After category filter:', filtered.length, 'expenses');
    }
    
    if (type === 'paymentMethod' && value !== 'all') {
      filtered = filtered.filter(expense => expense.bank_id === parseInt(value, 10));
      console.log('After payment method filter:', filtered.length, 'expenses');
    }
    
    if (type === 'is_recurring' && value !== '') {
      const isRecurring = value === 'true';
      filtered = filtered.filter(expense => expense.is_recurring === isRecurring);
      console.log('After recurring filter:', filtered.length, 'expenses');
    }
    
    // Filtros de data (mês e ano)
    if (type === 'months') {
      if (value === 'all') {
        console.log('Filter by all months');
        // Não filtrar por mês - mostrar todos
      } else {
        // Se o valor for um array, filtrar por qualquer um dos meses do array
        const months = Array.isArray(value) ? value : [value];
        console.log('Filtering by months:', months);
        const beforeFilter = filtered.length;
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          // Garantir que a data seja interpretada corretamente
          let expenseDate;
          try {
            // Formatar a data para garantir a interpretação correta
            const [year, month, day] = expense.date.split('T')[0].split('-').map(Number);
            expenseDate = new Date(year, month - 1, day);
            
            const expenseMonth = expenseDate.getMonth() + 1;
            const result = months.includes(expenseMonth);
            console.log(`Expense: ${expense.description}, Date: ${expense.date}, Parsed: ${expenseDate.toISOString()}, Month: ${expenseMonth}, Result: ${result}`);
            return result;
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
        
        console.log(`After month filter: ${filtered.length} expenses (removed ${beforeFilter - filtered.length})`);
      }
    }
    
    if (type === 'years') {
      if (value === 'all') {
        console.log('Filter by all years');
        // Não filtrar por ano - mostrar todos
      } else {
        // Se o valor for um array, filtrar por qualquer um dos anos do array
        const years = Array.isArray(value) ? value : [value];
        console.log('Filtering by years:', years);
        const beforeFilter = filtered.length;
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          // Garantir que a data seja interpretada corretamente
          try {
            // Formatar a data para garantir a interpretação correta
            const [year, month, day] = expense.date.split('T')[0].split('-').map(Number);
            const expenseDate = new Date(year, month - 1, day);
            
            const expenseYear = expenseDate.getFullYear();
            const result = years.includes(expenseYear);
            console.log(`Expense: ${expense.description}, Date: ${expense.date}, Parsed: ${expenseDate.toISOString()}, Year: ${expenseYear}, Result: ${result}`);
            return result;
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
        
        console.log(`After year filter: ${filtered.length} expenses (removed ${beforeFilter - filtered.length})`);
      }
    }
    
    setFilteredExpenses(filtered);
    setExpenses(filtered);
    console.log('Final filtered expenses:', filtered.length);
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
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Iniciando busca de despesas...');
        // Buscar despesas
        const expensesResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses`, {
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
          data: expensesData
        });
        
        // Extrair os dados de despesas do objeto retornado
        let extractedExpenses = [];
        
        if (typeof expensesData === 'object' && !Array.isArray(expensesData)) {
          if (expensesData.data && Array.isArray(expensesData.data)) {
            extractedExpenses = expensesData.data;
          } else if (expensesData.expenses && Array.isArray(expensesData.expenses)) {
            extractedExpenses = expensesData.expenses;
          } else if (expensesData.items && Array.isArray(expensesData.items)) {
            extractedExpenses = expensesData.items;
          } else if (expensesData.records && Array.isArray(expensesData.records)) {
            extractedExpenses = expensesData.records;
          } else {
            // Tentar encontrar qualquer propriedade que seja um array
            for (const key in expensesData) {
              if (Array.isArray(expensesData[key])) {
                extractedExpenses = expensesData[key];
                console.log(`Encontrado array na propriedade '${key}'`);
                break;
              }
            }
          }
        } else if (Array.isArray(expensesData)) {
          extractedExpenses = expensesData;
        }
        
        console.log('Despesas extraídas:', {
          length: extractedExpenses.length,
          data: extractedExpenses
        });
        
        setOriginalExpenses(extractedExpenses);
        setFilteredExpenses(extractedExpenses);
        setExpenses(extractedExpenses);

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
        // Garantir que expenses seja um array vazio em caso de erro
        setOriginalExpenses([]);
        setFilteredExpenses([]);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  // Efeito para aplicar filtros quando o termo de busca mudar
  useEffect(() => {
    filterExpenses(searchTerm);
  }, [searchTerm, originalExpenses]);

  const filterExpenses = (term = searchTerm) => {
    let filtered = [...originalExpenses];

    if (term) {
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(term.toLowerCase()) ||
        expense.Category?.category_name?.toLowerCase().includes(term.toLowerCase()) ||
        expense.Bank?.name?.toLowerCase().includes(term.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
    setExpenses(filtered);
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