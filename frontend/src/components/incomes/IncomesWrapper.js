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
      // Verificar se é uma ocorrência de receita recorrente ou receita original filtrada por mês
      if (income.isRecurringOccurrence || (income.is_recurring && income.originalRecurrenceId) || income.isFilteredOriginalRecurrence) {
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

      // Verificar se é uma ocorrência de uma receita recorrente ou receita original filtrada por mês
      if (income.isRecurringOccurrence || deleteOption === 'occurrence' || (income.is_recurring && income.originalRecurrenceId) || income.isFilteredOriginalRecurrence) {
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

        // Se é a receita original filtrada por mês, usar seu próprio ID
        if (!originalId && income.isFilteredOriginalRecurrence) {
          originalId = income.id;
          console.log('Usando ID da própria receita original filtrada:', originalId);
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

  // Efeito para carregar dados
  useEffect(() => {
    console.log('IncomesWrapper - Carregando dados iniciais');  

    const startDate = moment.tz(timeZone).startOf('month').toDate().toISOString();
    const endDate = moment.tz(timeZone).endOf('month').subtract(3, 'hours').toDate().toISOString();

    const thisMonth = moment.tz(timeZone).month();
    const thisYear = moment.tz(timeZone).year();
    

    // Definir filtros iniciais
    setFilters({
      months: [thisMonth],
      years: [thisYear],
      description: '',
      category_id: 'all',
      bank_id: 'all',
      is_recurring: ''
    });

    // Buscar dados com os filtros iniciais de data
    fetchData({
      startDate: startDate,
      endDate: endDate
    });
  }, [auth.token]);

  const fetchData = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Construir os parâmetros da query
      const queryParams = new URLSearchParams();

      // Adicionar parâmetros de período (nova abordagem com startDate e endDate)
      if (filterParams.startDate) {
        queryParams.append('startDate', filterParams.startDate);
      }

      if (filterParams.endDate) {
        queryParams.append('endDate', filterParams.endDate);
      }

      // Adicionar os parâmetros de filtro à URL para compatibilidade com filtros existentes
      if (!filterParams.startDate && !filterParams.endDate && filterParams.months && filterParams.months.length > 0) {
        filterParams.months.forEach(month => queryParams.append('months[]', month));
      }

      if (!filterParams.startDate && !filterParams.endDate && filterParams.years && filterParams.years.length > 0) {
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

      // Processar as receitas e remover duplicatas
      console.log('Verificando duplicatas em receitas. Total bruto:', extractedIncomes.length);
      
      // Primeiro, separar receitas normais e ocorrências
      const normalIncomes = [];
      const recurrenceOccurrences = [];
      
      // Conjunto para rastrear IDs de receitas que já foram processadas
      const processedIncomeIds = new Set();
      
      // Criar um mapa de IDs originais de ocorrências recorrentes
      const originalRecurringIds = new Map();
      
      // Mapa para armazenar exceções por ID da receita original
      const exceptionsMap = new Map();
      
      // Primeiro passo: identificar todas as ocorrências recorrentes e seus IDs originais
      extractedIncomes.forEach(income => {
        // Coletar exceções se existirem
        if (income.exceptions && Array.isArray(income.exceptions) && income.exceptions.length > 0) {
          const originalId = income.originalRecurrenceId || income.id;
          exceptionsMap.set(originalId.toString(), income.exceptions);
          console.log(`Exceções encontradas para a receita ${originalId}:`, income.exceptions.length);
        }
        
        if (income.isRecurringOccurrence) {
          recurrenceOccurrences.push(income);
          
          // Extrair ID original
          let originalId = null;
          if (income.originalRecurrenceId) {
            originalId = income.originalRecurrenceId;
          } else if (income.id && typeof income.id === 'string' && income.id.startsWith('rec_')) {
            const parts = income.id.split('_');
            if (parts.length >= 2) {
              originalId = parts[1];
            }
          }
          
          if (originalId) {
            // Armazenar a data da ocorrência junto com o ID original
            if (!originalRecurringIds.has(originalId.toString())) {
              originalRecurringIds.set(originalId.toString(), []);
            }
            originalRecurringIds.get(originalId.toString()).push({
              date: new Date(income.date),
              id: income.id
            });
          }
        } else {
          normalIncomes.push(income);
        }
      });
      
      console.log('IDs originais de receitas recorrentes:', 
        Array.from(originalRecurringIds.entries()).map(([id, dates]) => ({
          id, 
          occurrenceCount: dates.length
        }))
      );
      
      console.log('Exceções encontradas:', 
        Array.from(exceptionsMap.entries()).map(([id, exceptions]) => ({
          id, 
          exceptionCount: exceptions.length,
          exceptionDates: exceptions.map(ex => new Date(ex.exception_date).toISOString().slice(0, 10))
        }))
      );
      
      // Lista final de receitas sem duplicatas
      const dedupedIncomes = [];
      
      // Segundo passo: processar receitas normais, excluindo duplicatas de recorrências
      normalIncomes.forEach(income => {
        const incomeId = income.id?.toString();
        
        // Se a receita tem exceções, isso significa que ela não deve aparecer em certos meses
        const hasExceptions = income.exceptions && Array.isArray(income.exceptions) && income.exceptions.length > 0;
        
        // Se é uma receita recorrente original (não uma ocorrência gerada)
        if (income.is_recurring) {
          // Quando uma receita recorrente original aparece devido a filtro por mês,
          // marcamos ela com um flag especial para tratamento correto na exclusão
          if (filters.months && filters.months.length > 0) {
            const incomeDate = new Date(income.date);
            const incomeMonth = incomeDate.getMonth() + 1;
            
            // Se o mês da receita original está nos meses filtrados, tratamos como uma ocorrência para exclusão
            if (filters.months.includes(incomeMonth)) {
              income.isFilteredOriginalRecurrence = true;
              // Garantir que a originalRecurrenceId esteja presente para a lógica de exclusão
              income.originalRecurrenceId = income.id;
            }
          }
          
          // Verificação de duplicação com ocorrências (código existente)
          if (originalRecurringIds.has(incomeId)) {
            const occurrences = originalRecurringIds.get(incomeId);
            const incomeDate = new Date(income.date);
            const incomeDay = incomeDate.getDate();
            const incomeMonth = incomeDate.getMonth() + 1;
            const incomeYear = incomeDate.getFullYear();
            
            // Verificar se há ocorrências no mesmo mês/ano/dia da receita original
            const duplicatedOccurrence = occurrences.find(occ => {
              const occDate = occ.date;
              return occDate.getDate() === incomeDay && 
                     occDate.getMonth() + 1 === incomeMonth && 
                     occDate.getFullYear() === incomeYear;
            });
            
            if (duplicatedOccurrence) {
              console.log(`Receita recorrente ${incomeId} (${income.description}) duplicada no dia ${incomeDay}/${incomeMonth}/${incomeYear} - excluindo original`);
              // Ao invés de excluir completamente, vamos marcar para manter as opções de exclusão
              income.originalRecurrenceId = incomeId;
              income.isFilteredOriginalRecurrence = true;
              dedupedIncomes.push(income);
              return;
            }
          
            // Verificar se a data original tem uma exceção
            if (hasExceptions) {
              const originalDate = new Date(income.date);
              const originalDateStr = originalDate.toISOString().slice(0, 10);
              
              // Se a data original está nas exceções, não mostrar a receita original
              const isOriginalDateException = income.exceptions.some(ex => 
                new Date(ex.exception_date).toISOString().slice(0, 10) === originalDateStr
              );
              
              if (isOriginalDateException) {
                console.log(`Receita original ${incomeId} (${income.description}) tem exceção para a data ${originalDateStr} - ocultando`);
                return; // Pular esta receita original pois tem exceção para sua data
              }
            }
          
            // Se não houver duplicação, mantenha a receita original
            console.log(`Receita recorrente ${incomeId} (${income.description}) não está duplicada - mantendo`);
          }
        }
        
        // Adicionar a receita à lista final
        dedupedIncomes.push(income);
        processedIncomeIds.add(incomeId);
      });
      
      // Terceiro passo: adicionar ocorrências recorrentes
      recurrenceOccurrences.forEach(occurrence => {
        // Verificar se esta ocorrência deve ser mostrada ou se é uma exceção
        const originalId = occurrence.originalRecurrenceId || 
          (typeof occurrence.id === 'string' && occurrence.id.startsWith('rec_') ? 
           occurrence.id.split('_')[1] : null);
           
        const occurrenceDate = new Date(occurrence.date);
        const occurrenceDateStr = occurrenceDate.toISOString().slice(0, 10);
        const occurrenceDay = occurrenceDate.getDate();
        const occurrenceMonth = occurrenceDate.getMonth() + 1;
        const occurrenceYear = occurrenceDate.getFullYear();
        
        // Verificar se existe exceção para esta data
        const hasException = originalId && exceptionsMap.has(originalId.toString()) && 
          exceptionsMap.get(originalId.toString()).some(ex => 
            new Date(ex.exception_date).toISOString().slice(0, 10) === occurrenceDateStr
          );
          
        if (hasException) {
          console.log(`Ocorrência ${occurrence.id} excluída por ser uma exceção para a data ${occurrenceDateStr}`);
          return; // Pular esta ocorrência pois é uma exceção
        }
        
        // Verificar se já existe a receita original para esta mesma data/mês/dia
        // Isso pode acontecer quando a data original da receita coincide com uma das ocorrências
        
        // Procurar nas receitas já adicionadas (evitar duplicação com a original)
        const alreadyAddedOriginal = dedupedIncomes.some(income => {
          // Se for a receita original com mesmo ID
          if (income.id?.toString() === originalId?.toString() && income.is_recurring) {
            const incomeDate = new Date(income.date);
            return incomeDate.getDate() === occurrenceDay && 
                   incomeDate.getMonth() + 1 === occurrenceMonth && 
                   incomeDate.getFullYear() === occurrenceYear;
          }
          return false;
        });
        
        if (alreadyAddedOriginal) {
          console.log(`Ocorrência ${occurrence.id} duplicada com a receita original no dia ${occurrenceDay}/${occurrenceMonth}/${occurrenceYear} - ignorando`);
          // Mesmo nesses casos, precisamos garantir que a originalRecurrenceId esteja presente
          const foundOriginal = dedupedIncomes.find(income => 
            income.id?.toString() === originalId?.toString() && income.is_recurring
          );
          
          if (foundOriginal) {
            foundOriginal.originalRecurrenceId = originalId;
          }
          
          return; // Pular esta ocorrência pois a original já está no mesmo dia
        }
        
        // Adicionar a ocorrência à lista final
        dedupedIncomes.push(occurrence);
      });
      
      console.log('Receitas após remoção de duplicatas e exceções:', {
        original: extractedIncomes.length,
        dedupedTotal: dedupedIncomes.length,
        normalIncomesRetained: normalIncomes.length - (normalIncomes.length - dedupedIncomes.length + recurrenceOccurrences.length),
        recurrenceOccurrences: recurrenceOccurrences.length
      });
      
      // Exibe os dados antes de aplicar filtros
      console.log("Dados carregados após deduplicação:", dedupedIncomes.length);
      console.log("Período solicitado:", 
        filters.months?.map(m => `${m}/${filters.years?.[0] || new Date().getFullYear()}`).join(', ') || 
        `${new Date(filterParams.startDate || '').toLocaleDateString()} - ${new Date(filterParams.endDate || '').toLocaleDateString()}`
      );

      // Log detalhado de todas as receitas antes do filtro final
      console.log("Todas as receitas antes do filtro final:", 
        dedupedIncomes.map(inc => ({
          id: inc.id,
          type: inc.isRecurringOccurrence ? 'ocorrência' : (inc.is_recurring ? 'recorrente original' : 'normal'),
          description: inc.description,
          date: new Date(inc.date).toLocaleDateString(),
          dateObj: new Date(inc.date),
          day: new Date(inc.date).getDate(),
          month: new Date(inc.date).getMonth() + 1,
          year: new Date(inc.date).getFullYear(),
          hasExceptions: inc.exceptions?.length > 0,
          originalRecurrenceId: inc.originalRecurrenceId
        }))
      );

      // Log adicional para mostrar quais receitas recorrentes originais foram mantidas
      const recurringOriginals = dedupedIncomes.filter(inc => inc.is_recurring && !inc.isRecurringOccurrence);
      console.log(`Receitas recorrentes originais após filtro: ${recurringOriginals.length}`, 
        recurringOriginals.map(inc => ({
          id: inc.id,
          description: inc.description,
          date: new Date(inc.date).toLocaleDateString(),
          hasExceptions: inc.exceptions?.length > 0
        }))
      );

      // Verificação final para receitas com exceções
      const finalFilteredIncomes = dedupedIncomes.filter(income => {
        // Se não tem exceções, manter na lista
        if (!income.exceptions || !income.exceptions.length) {
          // Verificar se é uma receita original que tem uma ocorrência no mesmo dia
          if (income.is_recurring && !income.isRecurringOccurrence) {
            // Buscar na lista se existe alguma ocorrência recorrente deste mesmo ID original
            // que está no mesmo mês E ANO E DIA da receita original
            const originalDate = new Date(income.date);
            const originalDay = originalDate.getDate();
            const originalMonth = originalDate.getMonth() + 1;
            const originalYear = originalDate.getFullYear();
            
            const hasSameDayOccurrence = dedupedIncomes.some(otherIncome => {
              if (otherIncome.isRecurringOccurrence && otherIncome.originalRecurrenceId == income.id) {
                const occurrenceDate = new Date(otherIncome.date);
                return (
                  occurrenceDate.getDate() === originalDay &&
                  occurrenceDate.getMonth() + 1 === originalMonth &&
                  occurrenceDate.getFullYear() === originalYear
                );
              }
              return false;
            });
            
            if (hasSameDayOccurrence) {
              console.log(`Filtro final: Receita original ${income.id} (${income.description}) tem ocorrência para o mesmo dia ${originalDate.toLocaleDateString()} - removendo a original`);
              return false; // Remover a receita original, manter a ocorrência
            }
          }
          return true;
        }

        // Se é uma receita original (não ocorrência) com exceções:
        // Verificar novamente se a data da receita está nas exceções
        if (income.is_recurring && !income.isRecurringOccurrence) {
          const incomeDate = new Date(income.date);
          const incomeDateStr = incomeDate.toISOString().slice(0, 10);
          const matchingException = income.exceptions.find(ex => 
            new Date(ex.exception_date).toISOString().slice(0, 10) === incomeDateStr
          );
          
          if (matchingException) {
            console.log(`Filtro final: Receita original ${income.id} (${income.description}) com exceção para ${incomeDateStr} - removendo`);
            return false;
          }
        }

        return true;
      });

      if (dedupedIncomes.length !== finalFilteredIncomes.length) {
        console.log(`Filtro final removeu ${dedupedIncomes.length - finalFilteredIncomes.length} receitas com exceções`);
        setIncomes(finalFilteredIncomes);
        setFilteredIncomes(finalFilteredIncomes);
        setOriginalIncomes(finalFilteredIncomes);
      } else {
        setIncomes(dedupedIncomes);
        setFilteredIncomes(dedupedIncomes);
        setOriginalIncomes(dedupedIncomes);
      }

      // Examine alguns dados para debug
      if (dedupedIncomes.length > 0) {
        console.log("Exemplo de receita:", dedupedIncomes[0]);
        console.log("Data da receita:", dedupedIncomes[0].date);
        console.log("Formato da data:", typeof dedupedIncomes[0].date);
        // Verificar se a receita tem campos de recorrência
        if (dedupedIncomes[0].is_recurring) {
          console.log("Dados de recorrência:", {
            start_date: dedupedIncomes[0].start_date,
            end_date: dedupedIncomes[0].end_date,
            recurrence_type: dedupedIncomes[0].recurrence_type
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
      if (finalFilteredIncomes.length === 0) {
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

      setIncomes(finalFilteredIncomes);
      setFilteredIncomes(finalFilteredIncomes);
      setOriginalIncomes(finalFilteredIncomes);

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
              {incomeToDelete.isRecurringOccurrence || deleteOption === 'occurrence' || (incomeToDelete.is_recurring && incomeToDelete.originalRecurrenceId) || incomeToDelete.isFilteredOriginalRecurrence ? (
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