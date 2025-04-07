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
    
    // Caso especial para resetar todos os filtros
    if (type === 'resetAllFilters' && value === true) {
      console.log('Resetting all filters - showing all data');
      
      // Resetar o estado dos filtros para valores padrão, mas não aplicar filtragem
      setFilters({
        months: 'all',
        years: 'all',
        category: 'all',
        paymentMethod: 'all',
        hasInstallments: 'all',
        description: '',
        is_recurring: ''
      });
      
      // Mostrar todos os dados originais sem filtrar
      setFilteredExpenses([...originalExpenses]);
      setExpenses([...originalExpenses]);
      console.log('Reset complete - showing all', originalExpenses.length, 'expenses');
      return;
    }
    
    // Atualizar o estado do filtro
    setFilters(prevFilters => {
      // Criar uma cópia do estado atual dos filtros
      const newFilters = { ...prevFilters };
      
      // Atualizar apenas o filtro específico que está sendo modificado
      newFilters[type] = value;
      
      console.log('New filters state:', newFilters);
      
      // Aplicar todos os filtros aos dados originais
      let filtered = [...originalExpenses];
      console.log('Starting filtering with', filtered.length, 'expenses from original list');
      
      // Agora aplicamos os filtros um por um, verificando se cada um está ativo
      
      // Filtrar por termo de busca, se existir
      if (searchTerm) {
        filtered = filtered.filter(expense => 
          expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.Category?.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.Bank?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log('After search term filter:', filtered.length, 'expenses');
      }
      
      // Filtrar por categoria
      if (newFilters.category && newFilters.category !== 'all') {
        filtered = filtered.filter(expense => expense.category_id === parseInt(newFilters.category, 10));
        console.log('After category filter:', filtered.length, 'expenses');
      }
      
      // Filtrar por método de pagamento
      if (newFilters.paymentMethod && newFilters.paymentMethod !== 'all') {
        filtered = filtered.filter(expense => expense.bank_id === parseInt(newFilters.paymentMethod, 10));
        console.log('After payment method filter:', filtered.length, 'expenses');
      }
      
      // Filtrar por tipo (recorrente ou não)
      if (newFilters.is_recurring && newFilters.is_recurring !== '') {
        const isRecurring = newFilters.is_recurring === 'true';
        filtered = filtered.filter(expense => expense.is_recurring === isRecurring);
        console.log('After recurring filter:', filtered.length, 'expenses');
      }
      
      // Filtrar por mês somente se não for 'all'
      if (newFilters.months && newFilters.months !== 'all') {
        const months = Array.isArray(newFilters.months) ? newFilters.months : [newFilters.months];
        console.log('Filtering by months:', months);
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          try {
            const dateStr = expense.date;
            // Verificar se a data está em formato ISO ou outro formato
            let expenseMonth;
            
            if (dateStr.includes('T') || dateStr.includes('-')) {
              // Formato ISO ou yyyy-mm-dd
              const parts = dateStr.split('T')[0].split('-');
              expenseMonth = parseInt(parts[1], 10);
            } else if (dateStr.includes('/')) {
              // Formato dd/mm/yyyy
              const parts = dateStr.split('/');
              expenseMonth = parseInt(parts[1], 10);
            } else {
              // Tentar parse como timestamp
              const expenseDate = new Date(dateStr);
              expenseMonth = expenseDate.getMonth() + 1;
            }
            
            console.log(`Expense date: ${dateStr}, extracted month: ${expenseMonth}`);
            return months.includes(expenseMonth);
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
        console.log('After month filter:', filtered.length, 'expenses');
      }
      
      // Filtrar por ano somente se não for 'all'
      if (newFilters.years && newFilters.years !== 'all') {
        const years = Array.isArray(newFilters.years) ? newFilters.years : [newFilters.years];
        console.log('Filtering by years:', years);
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          try {
            const dateStr = expense.date;
            // Verificar se a data está em formato ISO ou outro formato
            let expenseYear;
            
            if (dateStr.includes('T') || dateStr.includes('-')) {
              // Formato ISO ou yyyy-mm-dd
              const parts = dateStr.split('T')[0].split('-');
              expenseYear = parseInt(parts[0], 10);
            } else if (dateStr.includes('/')) {
              // Formato dd/mm/yyyy
              const parts = dateStr.split('/');
              expenseYear = parseInt(parts[2], 10);
            } else {
              // Tentar parse como timestamp
              const expenseDate = new Date(dateStr);
              expenseYear = expenseDate.getFullYear();
            }
            
            console.log(`Expense date: ${dateStr}, extracted year: ${expenseYear}`);
            return years.includes(expenseYear);
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
        console.log('After year filter:', filtered.length, 'expenses');
      }
      
      // Atualizar os dados filtrados
      setFilteredExpenses(filtered);
      setExpenses(filtered);
      console.log('Final filtered expenses after all filters:', filtered.length);
      
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

  // Efeito para aplicar filtros quando os dados originais forem carregados
  useEffect(() => {
    if (originalExpenses.length > 0) {
      console.log('Dados originais carregados:', originalExpenses.length);
      
      // TEMPORÁRIO: Mostra todos os dados sem filtrar
      // Comentado para debugging
      /*
      // Reaplica o filtro de mês e ano atual
      const currentFilters = { ...filters };
      let filtered = [...originalExpenses];
      
      // Aplicar os filtros de data
      if (currentFilters.months && currentFilters.months !== 'all') {
        const months = Array.isArray(currentFilters.months) ? currentFilters.months : [currentFilters.months];
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          try {
            const [year, month, day] = expense.date.split('T')[0].split('-').map(Number);
            const expenseDate = new Date(year, month - 1, day);
            const expenseMonth = expenseDate.getMonth() + 1;
            return months.includes(expenseMonth);
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
      }
      
      if (currentFilters.years && currentFilters.years !== 'all') {
        const years = Array.isArray(currentFilters.years) ? currentFilters.years : [currentFilters.years];
        
        filtered = filtered.filter(expense => {
          if (!expense.date) return false;
          
          try {
            const [year, month, day] = expense.date.split('T')[0].split('-').map(Number);
            const expenseDate = new Date(year, month - 1, day);
            const expenseYear = expenseDate.getFullYear();
            return years.includes(expenseYear);
          } catch (error) {
            console.error('Erro ao interpretar data:', expense.date, error);
            return false;
          }
        });
      }
      
      setFilteredExpenses(filtered);
      setExpenses(filtered);
      console.log('Filtros iniciais aplicados, resultando em', filtered.length, 'despesas');
      */
      
      // Por enquanto, exibindo todos os dados para depuração
      setFilteredExpenses(originalExpenses);
      setExpenses(originalExpenses);
      console.log('Mostrando todos os dados sem filtrar:', originalExpenses.length);
    }
  }, [originalExpenses]);

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