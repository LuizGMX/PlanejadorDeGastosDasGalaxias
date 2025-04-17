import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Income from './Income';
import MobileIncomes from './MobileIncomes';
import dataTableStyles from '../../styles/dataTable.module.css';
import moment from 'moment-timezone';
import { toast } from 'react-hot-toast';
import { BsExclamationTriangle, BsX } from 'react-icons/bs';
import { FiTrash2 } from 'react-icons/fi';

// Replace 'America/Sao_Paulo' with your local timezone
const timeZone = 'America/Sao_Paulo';


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
  const [deleteOption, setDeleteOption] = useState(null); // 'all' ou 'single'
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
  const [noIncomesMessage, setNoIncomesMessage] = useState(null);

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

  const handleDeleteIncome = async (income, queryParams = '') => {
    try {
      // Verificar se é uma ocorrência de receita recorrente
      if (income.isRecurringOccurrence) {
        const occurrenceDate = new Date(income.date);
        setIncomeToDelete({
          ...income,
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

      // Receita normal ou receita recorrente original (não uma ocorrência)
      // Para receitas recorrentes, perguntar se quer excluir todas
      if (income.is_recurring) {
        setIncomeToDelete(income);
        setDeleteOption('recurring');
        setShowDeleteModal(true);
      } else {
        // Para receitas não recorrentes, confirmação padrão
        setIncomeToDelete(income);
        setDeleteOption('normal');
        setShowDeleteModal(true);
      }

    } catch (err) {
      console.error('Erro ao excluir receita:', err);
      toast.error('Erro ao excluir receita: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleConfirmDelete = async (option) => {
    try {
      if (!incomeToDelete) return;

      const income = incomeToDelete;
      let queryParams = '';

      // Verificar se é uma ocorrência de uma receita recorrente
      if (income.isRecurringOccurrence || deleteOption === 'occurrence') {
        // Extrair o ID da receita recorrente original
        let originalId = income.originalRecurrenceId;

        if (!originalId && income.id && typeof income.id === 'string' && income.id.startsWith('rec_')) {
          // Se não tiver o campo originalRecurrenceId, tentar extrair do ID
          const parts = income.id.split('_');
          if (parts.length >= 2) {
            originalId = parts[1];
            console.log('ID original extraído do ID da ocorrência:', originalId);
          }
        }

        if (!originalId) {
          toast.error('Não foi possível identificar a receita recorrente original');
          setShowDeleteModal(false);
          return;
        }

        if (option === 'all') {
          // Usuário escolheu excluir TODAS as ocorrências
          console.log('Excluindo receita recorrente completa:', originalId);

          // Excluir a receita recorrente original (todas as ocorrências)
          // Usar o endpoint específico para receitas recorrentes
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${originalId}/recurring${queryParams}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Erro ao excluir receita recorrente:', {
              status: response.status,
              statusText: response.statusText,
              data: errorData
            });
            throw new Error(`Falha ao excluir receita recorrente: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          toast.success(data.message || 'Receita recorrente excluída com sucesso (todas as ocorrências)');
        } else if (option === 'single') {
          // Usuário escolheu excluir APENAS a ocorrência atual
          const occurrenceDate = new Date(income.date);
          const mes = occurrenceDate.toLocaleString('pt-BR', { month: 'long' });
          const ano = occurrenceDate.getFullYear();

          console.log('Tentando excluir apenas a ocorrência:', {
            incomeId: originalId,
            occurrenceDate: occurrenceDate.toISOString(),
          });

          const inserirRecurrenceException = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${originalId}/exclude-occurrence`, {
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
            throw new Error(`Falha ao excluir ocorrência da receita recorrente: ${inserirRecurrenceException.status}`);
          }

          toast.success(`Receita excluída apenas para ${mes} de ${ano}`);
        }
      } else {
        // Receita normal ou receita recorrente original (não uma ocorrência)
        // Verificar se a receita é recorrente para usar o endpoint adequado
        const endpoint = income.is_recurring
          ? `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${income.id}/recurring${queryParams}`
          : `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${income.id}${queryParams}`;

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir receita');
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
      console.error('Erro ao excluir receita:', err);
      toast.error('Erro ao excluir receita: ' + (err.message || 'Erro desconhecido'));
      setShowDeleteModal(false);
    }
  };

  const handleSearch = (term) => {
    console.log('Searching for:', term);
    setSearchTerm(term);

    // Atualizar o termo de busca e manter os outros filtros
    setFilters(prevFilters => {
      const updatedFilters = {
        ...prevFilters,
        description: term
      };

      console.log('Filtros atualizados após busca:', updatedFilters);

      // Aplicar todos os filtros juntos
      setTimeout(() => {
        // Calcular datas com base nos meses e anos selecionados
        let startDate, endDate;

        if (updatedFilters.months && updatedFilters.months.length > 0 && updatedFilters.years && updatedFilters.years.length > 0) {
          const minMonth = Math.min(...updatedFilters.months);
          const maxMonth = Math.max(...updatedFilters.months);
          const minYear = Math.min(...updatedFilters.years);
          const maxYear = Math.max(...updatedFilters.years);

          startDate = new Date(minYear, minMonth - 1, 1);
          const lastDay = new Date(maxYear, maxMonth, 0).getDate();
          endDate = new Date(maxYear, maxMonth - 1, lastDay, 23, 59, 59);
        }

        const backendFilters = {
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          description: updatedFilters.description || undefined,
          category_id: updatedFilters.category_id !== 'all' ? updatedFilters.category_id : undefined,
          bank_id: updatedFilters.bank_id !== 'all' ? updatedFilters.bank_id : undefined,
          is_recurring: updatedFilters.is_recurring !== '' ? updatedFilters.is_recurring : undefined
        };

        console.log('Enviando filtros completos para API após busca:', backendFilters);
        fetchData(backendFilters);
      }, 0);

      return updatedFilters;
    });
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
      setSearchTerm('');

      // Buscar todos os dados sem filtros
      fetchData({});
      return;
    }

    // Atualizar o estado do filtro e depois buscar os dados
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };

      // Atualizar o valor do filtro específico
      newFilters[type] = value;

      console.log('Novos filtros para receitas (combinando todos):', newFilters);

      // Buscar dados com os novos filtros após atualizar o estado
      setTimeout(() => {
        // Calcular datas com base nos meses e anos selecionados
        let startDate, endDate;

        if (newFilters.months && newFilters.months.length > 0 && newFilters.years && newFilters.years.length > 0) {
          const minMonth = Math.min(...newFilters.months);
          const maxMonth = Math.max(...newFilters.months);
          const minYear = Math.min(...newFilters.years);
          const maxYear = Math.max(...newFilters.years);

          startDate = new Date(minYear, minMonth - 1, 1);
          const lastDay = new Date(maxYear, maxMonth, 0).getDate();
          endDate = new Date(maxYear, maxMonth - 1, lastDay, 23, 59, 59);
        }

        // Converter filtros internos para o formato da API
        const backendFilters = {
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
          description: newFilters.description || undefined,
          category_id: newFilters.category_id !== 'all' ? newFilters.category_id : undefined,
          bank_id: newFilters.bank_id !== 'all' ? newFilters.bank_id : undefined,
          is_recurring: newFilters.is_recurring !== '' ? newFilters.is_recurring : undefined
        };

        console.log('Filtros completos enviados para a API de receitas:', backendFilters);
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

  // Efeito para inicializar a busca de dados ao montar o componente
  useEffect(() => {
    fetchData(filters, true); // Força inclusão de receitas recorrentes
  }, []);

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
      
      if (filterParams.is_recurring !== undefined && filterParams.is_recurring !== '') {
        queryParams.append('is_recurring', filterParams.is_recurring);
      }
      
      // Adicionar parâmetro para forçar o backend a incluir todas as receitas recorrentes
      if (forceIncludeRecurring) {
        queryParams.append('include_all_recurring', 'true');
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
        sample: incomesData?.length > 0 ? incomesData[0] : null
      });
      
      // Verificar detalhes das ocorrências recorrentes
      if (Array.isArray(incomesData)) {
        const recurringOccurrences = incomesData.filter(income => income.isRecurringOccurrence === true);
        console.log('Ocorrências recorrentes de receitas:', {
          count: recurringOccurrences.length,
          samples: recurringOccurrences.slice(0, 2) // Mostrar as primeiras duas ocorrências, se houver
        });
      }
      
      // Extração dos dados de receitas
      let extractedIncomes = [];
      
      if (Array.isArray(incomesData)) {
        extractedIncomes = incomesData;
      } else {
        console.error('Formato de dados inesperado:', incomesData);
        extractedIncomes = [];
      }
      
      // Processar as ocorrências recorrentes especificamente para o mês atual
      if (extractedIncomes.length > 0) {
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
          
          console.log("Filtrando receitas por meses:", monthsArray, "e anos:", yearsArray);
          
          // Filtrar para garantir que só temos ocorrências dos meses e anos filtrados
          extractedIncomes = extractedIncomes.filter(income => {
            const incomeDate = new Date(income.date);
            const incomeMonth = incomeDate.getMonth() + 1; // 0-based to 1-based
            const incomeYear = incomeDate.getFullYear();
            
            // Verificar se o mês e ano da receita estão nos filtros
            const monthMatches = monthsArray.includes(incomeMonth) || monthsArray.map(Number).includes(incomeMonth);
            const yearMatches = yearsArray.includes(incomeYear) || yearsArray.map(Number).includes(incomeYear);
            
            return monthMatches && yearMatches;
          });
          
          console.log(`Após filtrar por mês/ano, restaram ${extractedIncomes.length} receitas`);
        }
      }
      
      console.log('Receitas extraídas:', {
        length: extractedIncomes.length,
        sample: extractedIncomes.length > 0 ? extractedIncomes[0] : null
      });
      
      // Filtragem adicional no frontend, se necessário
      const filteredData = extractedIncomes;
      
      // Ordenar receitas por data (mais recentes primeiro)
      filteredData.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      setIncomes(filteredData);
      setOriginalIncomes(filteredData);
      setFilteredIncomes(filteredData);

      // Examine alguns dados para debug
      if (filteredData.length > 0) {
        console.log("Exemplo de receita:", filteredData[0]);
        console.log("Data da receita:", filteredData[0].date);
        console.log("Formato da data:", typeof filteredData[0].date);
        // Verificar se a receita tem campos de recorrência
        if (filteredData[0].is_recurring) {
          console.log("Dados de recorrência:", {
            start_date: filteredData[0].start_date,
            end_date: filteredData[0].end_date,
            recurrence_type: filteredData[0].recurrence_type
          });
        }
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

      // Define a mensagem quando não há receitas
      if (filteredData.length === 0) {
        console.log('Nenhuma receita encontrada para os filtros aplicados');
        
        // Verifica se há filtros ativos
        const hasActiveFilters = (filters.months && filters.months.length !== 1) || 
                               (filters.years && filters.years.length !== 1) || 
                               filters.category_id !== 'all' || 
                               filters.bank_id !== 'all' || 
                               filters.description !== '' || 
                               filters.is_recurring !== '';

        setNoIncomesMessage(hasActiveFilters ? {
          message: 'Nenhuma receita encontrada para os filtros selecionados.',
          suggestion: 'Tente ajustar os filtros para ver mais resultados.'
        } : {
          message: 'Você ainda não tem receitas cadastradas para este período.',
          suggestion: 'Que tal começar adicionando sua primeira receita?'
        });
      } else {
        setNoIncomesMessage(null);
      }

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
    console.log('Aplicando filtros para receitas no backend');

    // Construir as datas de início e fim com base nos filtros de mês e ano
    let startDate, endDate;

    if (filters.months && filters.months.length > 0 && filters.years && filters.years.length > 0) {
      // Se temos meses e anos específicos, calcular o intervalo de datas
      const minMonth = Math.min(...filters.months);
      const maxMonth = Math.max(...filters.months);
      const minYear = Math.min(...filters.years);
      const maxYear = Math.max(...filters.years);

      // Criar data de início (primeiro dia do mês mínimo)
      startDate = new Date(minYear, minMonth - 1, 1);

      // Criar data de fim (último dia do mês máximo)
      const lastDay = new Date(maxYear, maxMonth, 0).getDate();
      endDate = new Date(maxYear, maxMonth - 1, lastDay, 23, 59, 59);

      console.log('Filtro por período:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        meses: filters.months,
        anos: filters.years
      });
    }

    // Mapear os filtros do estado para o formato que o backend espera
    const backendFilters = {
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
      category_id: filters.category_id !== 'all' ? filters.category_id : undefined,
      bank_id: filters.bank_id !== 'all' ? filters.bank_id : undefined,
      is_recurring: filters.is_recurring !== '' ? filters.is_recurring : undefined,
      description: filters.description || undefined
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
  return (
    <>
      {isMobile ? (
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
          noIncomesMessage={noIncomesMessage}
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
          noIncomesMessage={noIncomesMessage}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && incomeToDelete && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={dataTableStyles.modalContent}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              {incomeToDelete.isRecurringOccurrence || deleteOption === 'occurrence' ? (
                // Modal para ocorrências de receitas recorrentes
                <>
                  <p>Como deseja excluir esta receita recorrente?</p>
                  <p><strong>{incomeToDelete.description}</strong></p>
                  
                  {incomeToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data desta ocorrência: {new Date(incomeToDelete.date).toLocaleDateString('pt-BR', {
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
                      {incomeToDelete.date && (
                        <span> 
                          ({new Date(incomeToDelete.date).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })})
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
                        setIncomeToDelete(null);
                        setDeleteOption(null);
                      }}
                    >
                      <BsX /> Cancelar
                    </button>
                  </div>
                </>
              ) : deleteOption === 'recurring' ? (
                // Modal para receitas recorrentes (original)
                <>
                  <p>Deseja realmente excluir esta receita recorrente e todas as suas ocorrências?</p>
                  <p><strong>{incomeToDelete.description}</strong></p>
                  
                  {incomeToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data de início: {new Date(incomeToDelete.start_date || incomeToDelete.date).toLocaleDateString('pt-BR', {
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  {incomeToDelete.exceptions && incomeToDelete.exceptions.length > 0 && (
                    <div className={dataTableStyles.exceptionsInfo}>
                      <p>Esta receita recorrente possui {incomeToDelete.exceptions.length} exceções:</p>
                      <ul>
                        {incomeToDelete.exceptions.slice(0, 3).map((exception, index) => (
                          <li key={index}>
                            {new Date(exception.exception_date).toLocaleDateString('pt-BR', {
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric'
                            })}
                          </li>
                        ))}
                        {incomeToDelete.exceptions.length > 3 && (
                          <li>...e mais {incomeToDelete.exceptions.length - 3} exceções</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className={dataTableStyles.modalActions}>
                    <button
                      className={dataTableStyles.secondaryButton}
                      onClick={() => {
                        setShowDeleteModal(false);
                        setIncomeToDelete(null);
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
                // Modal para receitas normais (não recorrentes)
                <>
                  <p>Deseja realmente excluir esta receita?</p>
                  <p><strong>{incomeToDelete.description}</strong></p>
                  
                  {incomeToDelete.date && (
                    <p className={dataTableStyles.modalInfo}>
                      Data: {new Date(incomeToDelete.date).toLocaleDateString('pt-BR', {
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
                        setIncomeToDelete(null);
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

export default IncomesWrapper; 