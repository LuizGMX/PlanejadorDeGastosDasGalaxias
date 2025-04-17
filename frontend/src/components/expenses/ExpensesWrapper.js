import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Expenses from './Expenses';
import MobileExpenses from './MobileExpenses';
import styles from '../../styles/shared.module.css';
import '../../styles/dataTable.module.css';
import { toast } from 'react-hot-toast';
import { BsExclamationTriangle, BsX } from 'react-icons/bs';
import { FiTrash2 } from 'react-icons/fi';

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
  const [deleteOption, setDeleteOption] = useState(null); // 'all', 'future', 'past', 'single'
  
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
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);

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


  const handleBulkDelete = async () => {
    try {
      if (selectedExpenses.length === 0) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ ids: selectedExpenses })
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir despesas em lote');
      }

      const data = await response.json();
      toast.success(data.message || 'Despesas excluídas com sucesso');
      
      // Limpar seleção e recarregar dados
      setSelectedExpenses([]);
      await fetchData(filters, true);
    } catch (err) {
      console.error('Erro ao excluir despesas em lote:', err);
      toast.error('Erro ao excluir despesas em lote');
    }
  };

  const handleDeleteExpense = async (expense, queryParams = '') => {
    try {
      // Verificar se é uma ocorrência de despesa recorrente ou despesa original filtrada por mês
      if (expense.isRecurringOccurrence || (expense.is_recurring && expense.originalRecurrenceId) || expense.isFilteredOriginalRecurrence) {
        const occurrenceDate = new Date(expense.date);
        setIncomeToDelete({
          ...expense,
          formattedDate: occurrenceDate.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        });
        setDeleteOption('occurrence');
        setShowDeleteModal(true);
        return;
      }

      // Receita normal ou despesa recorrente original (não uma ocorrência)
      // Para despesas recorrentes, perguntar se quer excluir todas
      if (expense.is_recurring) {
        setIncomeToDelete(expense);
        setDeleteOption('recurring');
        setShowDeleteModal(true);
      } else {
        // Para despesas não recorrentes, confirmação padrão
        setIncomeToDelete(expense);
        setDeleteOption('normal');
        setShowDeleteModal(true);
      }

    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
      toast.error('Erro ao excluir despesa: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleConfirmDelete = async (option) => {
    try {
      if (!expenseToDelete) return;

      const expense = expenseToDelete;
      let queryParams = '';

      // Verificar se é uma ocorrência de uma despesa recorrente ou despesa original filtrada por mês
      if (expense.isRecurringOccurrence || deleteOption === 'occurrence' || (expense.is_recurring && expense.originalRecurrenceId) || expense.isFilteredOriginalRecurrence) {
        // Extrair o ID da despesa recorrente original
        let originalId = expense.originalRecurrenceId;

        if (!originalId && expense.id && typeof expense.id === 'string' && expense.id.startsWith('rec_')) {
          // Se não tiver o campo originalRecurrenceId, tentar extrair do ID
          const parts = expense.id.split('_');
          if (parts.length >= 2) {
            originalId = parts[1];
            console.log('ID original extraído do ID da ocorrência:', originalId);
          }
        }

        // Se é a despesa original filtrada por mês, usar seu próprio ID
        if (!originalId && expense.isFilteredOriginalRecurrence) {
          originalId = expense.id;
          console.log('Usando ID da própria despesa original filtrada:', originalId);
        }

        if (!originalId) {
          toast.error('Não foi possível identificar a despesa recorrente original');
          setShowDeleteModal(false);
          return;
        }

        if (option === 'all') {
          // Usuário escolheu excluir TODAS as ocorrências
          console.log('Excluindo despesa recorrente completa:', originalId);

          // Excluir a despesa recorrente original (todas as ocorrências)
          // Usar o endpoint específico para despesas recorrentes
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${originalId}/recurring${queryParams}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro ao excluir despesa recorrente:', {
              status: response.status,
              statusText: response.statusText,
              data: errorData
            });
            throw new Error(`Falha ao excluir despesa recorrente: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          toast.success(data.message || 'Receita recorrente excluída com sucesso (todas as ocorrências)');
        } else if (option === 'single') {
          // Usuário escolheu excluir APENAS a ocorrência atual
          const occurrenceDate = new Date(expense.date);
          const mes = occurrenceDate.toLocaleString('pt-BR', { month: 'long' });
          const ano = occurrenceDate.getFullYear();

          console.log('Tentando excluir apenas a ocorrência:', {
            expenseId: originalId,
            occurrenceDate: occurrenceDate.toISOString(),
          });

          const inserirRecurrenceException = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${originalId}/exclude-occurrence`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              occurrence_date: occurrenceDate.toISOString(),
              reason: 'Exclusão manual pelo usuário'
            })
          });

          if (!inserirRecurrenceException.ok) {
            throw new Error(`Falha ao excluir ocorrência da despesa recorrente: ${inserirRecurrenceException.status}`);
          }

          toast.success(`Receita excluída apenas para ${mes} de ${ano}`);
        }
      } else {
        // Receita normal ou despesa recorrente original (não uma ocorrência)
        // Verificar se a despesa é recorrente para usar o endpoint adequado
        const endpoint = expense.is_recurring
          ? `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}/recurring${queryParams}`
          : `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}${queryParams}`;

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir despesa');
        }

        const data = await response.json();
        toast.success(data.message || 'Receita excluída com sucesso');
      }

      // Recarregar os dados após a exclusão ou criação de exceção
      // Calcular datas atuais para atualizar a visualização
      let startDate, endDate;

      if (filters.months && filters.months.length > 0 && filters.years && filters.years.length > 0) {
        const minMonth = Math.min(...filters.months);
        const maxMonth = Math.max(...filters.months);
        const minYear = Math.min(...filters.years);
        const maxYear = Math.max(...filters.years);

        startDate = new Date(minYear, minMonth - 1, 1);
        const lastDay = new Date(maxYear, maxMonth, 0).getDate();
        endDate = new Date(maxYear, maxMonth - 1, lastDay, 23, 59, 59);
      }

      await fetchData({
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
        category_id: filters.category_id !== 'all' ? filters.category_id : undefined,
        bank_id: filters.bank_id !== 'all' ? filters.bank_id : undefined,
        is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
        description: filters.description || undefined
      });

      // Fechar o modal após a conclusão
      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setDeleteOption(null);
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
      toast.error('Erro ao excluir despesa: ' + (err.message || 'Erro desconhecido'));
      setShowDeleteModal(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setExpenseToDelete(null);
    setDeleteOption(null);
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
    
    // Buscar dados com os filtros iniciais e forçar inclusão de despesas recorrentes
    fetchData(filters, true);
  }, [auth.token]);

  const fetchData = async (filterParams = {}, forceIncludeRecurring = false) => {
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
      
      // Adicionar parâmetro para forçar o backend a incluir todas as despesas recorrentes
      if (forceIncludeRecurring) {
        queryParams.append('include_all_recurring', 'true');
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
      
      // Verificar detalhes das ocorrências recorrentes
      if (Array.isArray(expensesData)) {
        const recurringOccurrences = expensesData.filter(expense => expense.isRecurringOccurrence === true);
        console.log('Ocorrências recorrentes:', {
          count: recurringOccurrences.length,
          samples: recurringOccurrences.slice(0, 2) // Mostrar as primeiras duas ocorrências, se houver
        });
      }
      
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
      
      // Processar as ocorrências recorrentes especificamente para o mês atual
      if (extractedExpenses.length > 0) {
        // Verificar se temos ocorrências recorrentes com mês diferente do atual
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // 0-based to 1-based
        const currentYear = currentDate.getFullYear();
        
        // Filtrar as ocorrências recorrentes para o período filtrado
        if (filterParams.months && filterParams.years) {
          const monthsArray = Array.isArray(filterParams.months) 
            ? filterParams.months 
            : [filterParams.months];
          
          const yearsArray = Array.isArray(filterParams.years) 
            ? filterParams.years 
            : [filterParams.years];
          
          console.log("Filtrando por meses:", monthsArray, "e anos:", yearsArray);
          
          // Filtrar para garantir que só temos ocorrências dos meses e anos filtrados
          extractedExpenses = extractedExpenses.filter(expense => {
            const expenseDate = new Date(expense.expense_date);
            const expenseMonth = expenseDate.getMonth() + 1; // 0-based to 1-based
            const expenseYear = expenseDate.getFullYear();
            
            // Verificar se o mês e ano da despesa estão nos filtros
            const monthMatches = monthsArray.includes(expenseMonth) || monthsArray.map(Number).includes(expenseMonth);
            const yearMatches = yearsArray.includes(expenseYear) || yearsArray.map(Number).includes(expenseYear);
            
            return monthMatches && yearMatches;
          });
          
          console.log(`Após filtrar por mês/ano, restaram ${extractedExpenses.length} despesas`);
        }
      }
      
      setOriginalExpenses(extractedExpenses);
      setFilteredExpenses(extractedExpenses);
      setExpenses(extractedExpenses);
      
      // Exibe os dados antes de aplicar filtros
      console.log("Dados carregados antes de filtros:", extractedExpenses.length);
      
      // Verifica se não há despesas para exibir mensagem
      if (extractedExpenses.length === 0) {
        setNoExpensesMessage("Nenhuma despesa encontrada para o período selecionado.");
      } else {
        setNoExpensesMessage(null);
      }
      
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

  return (
    <>
      {isMobile ? (
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
          noExpensesMessage={noExpensesMessage}
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
          categories={categories}
          banks={banks}
          filters={filters}
          noExpensesMessage={noExpensesMessage}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && expenseToDelete && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={dataTableStyles.modalContent}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              {expenseToDelete.isRecurringOccurrence || deleteOption === 'occurrence' || (expenseToDelete.is_recurring && expenseToDelete.originalRecurrenceId) || expenseToDelete.isFilteredOriginalRecurrence ? (
                // Modal para ocorrências de despesas recorrentes
                <>
                  <p>Como deseja excluir esta despesa recorrente?</p>
                  <p><strong>{expenseToDelete.description}</strong></p>
                  
                  {expenseToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data desta ocorrência: {new Date(expenseToDelete.date || expenseToDelete.expense_date).toLocaleDateString('pt-BR', {
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  <div className={dataTableStyles.modalOptions}>
                    <button
                      className={dataTableStyles.optionButton}
                      onClick={() => handleConfirmDelete('single')}
                    >
                      Excluir APENAS esta ocorrência 
                      {expenseToDelete.date && (
                        <span> 
                          ({new Date(expenseToDelete.date || expenseToDelete.expense_date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })})
                        </span>
                      )}
                    </button>
                    <button
                      className={`${dataTableStyles.optionButton} ${dataTableStyles.dangerButton}`}
                      onClick={() => handleConfirmDelete('all')}
                    >
                      Excluir TODAS as ocorrências (atual e futuras)
                    </button>
                  </div>
                  
                  <div className={dataTableStyles.modalActions}>
                    <button
                      className={dataTableStyles.secondaryButton}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setExpenseToDelete(null);
                        setDeleteOption(null);
                      }}
                    >
                      <BsX /> Cancelar
                    </button>
                  </div>
                </>
              ) : deleteOption === 'installment' ? (
                // Modal para despesas parceladas
                <>
                  <p>Como deseja excluir esta despesa parcelada?</p>
                  <p><strong>{expenseToDelete.description}</strong></p>
                  
                  {expenseToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data da parcela: {new Date(expenseToDelete.date || expenseToDelete.expense_date).toLocaleDateString('pt-BR', {
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  <div className={dataTableStyles.modalOptions}>
                    <button
                      className={dataTableStyles.optionButton}
                      onClick={() => handleConfirmDelete('single')}
                    >
                      Excluir APENAS esta parcela
                    </button>
                    <button
                      className={`${dataTableStyles.optionButton} ${dataTableStyles.dangerButton}`}
                      onClick={() => handleConfirmDelete('all')}
                    >
                      Excluir TODAS as parcelas
                    </button>
                  </div>
                  
                  <div className={dataTableStyles.modalActions}>
                    <button
                      className={dataTableStyles.secondaryButton}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setExpenseToDelete(null);
                        setDeleteOption(null);
                      }}
                    >
                      <BsX /> Cancelar
                    </button>
                  </div>
                </>
              ) : deleteOption === 'recurring' ? (
                // Modal para despesas recorrentes (original)
                <>
                  <p>Deseja realmente excluir esta despesa recorrente e todas as suas ocorrências?</p>
                  <p><strong>{expenseToDelete.description}</strong></p>
                  
                  {expenseToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data de início: {new Date(expenseToDelete.start_date || expenseToDelete.date || expenseToDelete.expense_date).toLocaleDateString('pt-BR', {
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  {expenseToDelete.exceptions && expenseToDelete.exceptions.length > 0 && (
                    <div className={dataTableStyles.exceptionsInfo}>
                      <p>Esta despesa recorrente possui {expenseToDelete.exceptions.length} exceções:</p>
                      <ul>
                        {expenseToDelete.exceptions.slice(0, 3).map((exception, index) => (
                          <li key={index}>
                            {new Date(exception.exception_date).toLocaleDateString('pt-BR', {
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric'
                            })}
                          </li>
                        ))}
                        {expenseToDelete.exceptions.length > 3 && (
                          <li>...e mais {expenseToDelete.exceptions.length - 3} exceções</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className={dataTableStyles.modalActions}>
                    <button
                      className={dataTableStyles.secondaryButton}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setExpenseToDelete(null);
                      }}
                    >
                      <BsX /> Cancelar
                    </button>
                    <button
                      className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
                      onClick={() => handleConfirmDelete('all')}
                    >
                      <FiTrash2 /> Confirmar
                    </button>
                  </div>
                </>
              ) : (
                // Modal para despesas normais (não recorrentes)
                <>
                  <p>Deseja realmente excluir esta despesa?</p>
                  <p><strong>{expenseToDelete.description}</strong></p>
                  
                  {expenseToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data: {new Date(expenseToDelete.date || expenseToDelete.expense_date).toLocaleDateString('pt-BR', {
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  <div className={dataTableStyles.modalActions}>
                    <button
                      className={dataTableStyles.secondaryButton}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setExpenseToDelete(null);
                      }}
                    >
                      <BsX /> Cancelar
                    </button>
                    <button
                      className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
                      onClick={() => handleConfirmDelete('all')}
                    >
                      <FiTrash2 /> Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpensesWrapper; 