import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditExpenseForm from './EditExpenseForm';
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
  BsCreditCard2Front,
  BsCashCoin,
  BsWallet2,
  BsFolderSymlink,
  BsChevronDown,
  BsChevronUp
} from 'react-icons/bs';

const Expenses = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
  const [openFilter, setOpenFilter] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [showInstallmentMessage, setShowInstallmentMessage] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0 });
  const [deleteOption, setDeleteOption] = useState(null);
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});

  const years = Array.from(
    { length: 11 },
    (_, i) => ({
      value: 2025 + i,
      label: (2025 + i).toString()
    })
  );

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

  const paymentMethods = [
    { value: 'all', label: 'Todos os Métodos' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'money', label: 'Dinheiro' }
  ];

  const installmentOptions = [
    { value: 'all', label: 'Todas as Despesas' },
    { value: 'yes', label: 'Apenas Parceladas' },
    { value: 'no', label: 'Apenas Não Parceladas' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obter um token válido, tentando primeiro o contexto e depois localStorage
        let token = auth.token;
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage para fetchData...');
          token = localStorage.getItem('token');
          if (!token) {
            console.error('Nenhum token de autenticação encontrado para fetchData');
            navigate('/login');
            return;
          }
        }
        
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

  useEffect(() => {
    fetchExpenses();
  }, [auth.token, filters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll(`.${dataTableStyles.modernSelect}`);
      let clickedOutside = true;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

    if (type === 'is_recurring') {
      setFilters(prev => ({ ...prev, is_recurring: value }));
      return;
    }

    if (type === 'category') {
      // Immediately update the filter state for category
      setFilters(prev => ({ ...prev, category: value }));
      // If running on mobile, close the filter after selection
      if (isMobile) {
        setOpenFilter(null);
      }
      return;
    }

    if (type === 'paymentMethod') {
      // Immediately update the filter state for payment method
      setFilters(prev => ({ ...prev, paymentMethod: value }));
      // If running on mobile, close the filter after selection
      if (isMobile) {
        setOpenFilter(null);
      }
      return;
    }

    if (type === 'hasInstallments') {
      setFilters(prev => ({ ...prev, hasInstallments: value }));
      return;
    }

    if (value === 'all') {
      setFilters(prev => ({
        ...prev,
        [type]: prev[type].length === (type === 'months' ? months.length : years.length) 
          ? [] 
          : type === 'months' 
            ? months.map(m => m.value) 
            : years.map(y => y.value)
      }));
    } else {
      setFilters(prev => {
        const newValues = prev[type].includes(value)
          ? prev[type].filter(item => item !== value)
          : [...prev[type], value];

        return {
          ...prev,
          [type]: newValues
        };
      });
    }
  };

  const fetchExpenses = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // Adiciona meses e anos como arrays
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      // Adiciona outros filtros
      if (filters.category && filters.category !== 'all') {
        queryParams.append('category_id', filters.category);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        queryParams.append('payment_method', filters.paymentMethod);
      }
      if (filters.hasInstallments && filters.hasInstallments !== 'all') {
        queryParams.append('has_installments', filters.hasInstallments === 'yes');
      }
      if (filters.description) {
        queryParams.append('description', filters.description);
      }
      if (filters.is_recurring !== '') {
        queryParams.append('is_recurring', filters.is_recurring);
      }

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

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

      if (response.status === 401) {
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
        try {
          // Tentar parsear o erro como JSON
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Erro ao carregar despesas');
        } catch (jsonError) {
          // Se não for possível parsear como JSON
          throw new Error('Erro ao carregar despesas');
        }
      }

      // Parse the response text as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }

      setExpenses(Array.isArray(data) ? data : []);
      setSelectedExpenses([]);

      // Define a mensagem quando não há despesas
      if (!data || !Array.isArray(data) || data.length === 0) {
        // Verifica se há filtros ativos
        const hasActiveFilters = filters.months.length !== 1 || 
                               filters.years.length !== 1 || 
                               filters.category !== 'all' || 
                               filters.paymentMethod !== 'all' || 
                               filters.hasInstallments !== 'all' || 
                               filters.description !== '' || 
                               filters.is_recurring !== '';

        setNoExpensesMessage(hasActiveFilters ? {
          message: 'Nenhuma despesa encontrada para os filtros selecionados.',
          suggestion: 'Tente ajustar os filtros para ver mais resultados.'
        } : {
          message: 'Você ainda não tem despesas cadastradas para este período.',
          suggestion: 'Que tal começar adicionando sua primeira despesa?'
        });
      } else {
        setNoExpensesMessage(null);
      }
    } catch (err) {
      console.error('Erro ao carregar despesas:', err);
      setError(err.message || 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Seleciona apenas despesas que não são parceladas
      const nonInstallmentExpenses = expenses
        .filter(expense => !expense.has_installments)
        .map(expense => expense.id);
      setSelectedExpenses(nonInstallmentExpenses);
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleSelectExpense = (id, event) => {
    const expense = expenses.find(e => e.id === id);
    if (expense?.has_installments) {
      const rect = event.target.getBoundingClientRect();
      setMessagePosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 5
      });
      setShowInstallmentMessage(true);
      setTimeout(() => setShowInstallmentMessage(false), 3000);
      return;
    }

    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expenseId => expenseId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteClick = (expense = null) => {
    if (expense) {
      setExpenseToDelete(expense);
      setDeleteOption('single');
      
      if (expense.is_recurring) {
        setDeleteOptions({
          type: 'recurring'
        });
      } else if (expense.has_installments) {
        setDeleteOptions({
          type: 'installment',
          installmentGroupId: expense.installment_group_id
        });
      } else {
        setDeleteOptions({
          type: 'single'
        });
      }
    } else {
      // Deleção em massa
      setExpenseToDelete(null);
      setDeleteOption(null);
      setDeleteOptions({
        type: 'bulk',
        ids: selectedExpenses
      });
    }
    setShowDeleteModal(true);
  };

  const handleDelete = async (expense) => {
    try {
      // Se for deleção em massa
      if (deleteOptions.type === 'bulk') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/bulk`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: deleteOptions.ids })
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir despesas');
        }

        const data = await response.json();

        // Limpa os estados do modal
        setShowDeleteModal(false);
        setExpenseToDelete(null);
        setDeleteOptions({ type: 'single' });
        setSelectedExpenses([]);
        setDeleteOption(null);

        // Mostra mensagem de sucesso
        toast.success(data.message);

        // Recarrega a lista de despesas
        await fetchExpenses();
        return;
      }

      // Se não houver uma despesa para excluir ou se for recorrente sem opção selecionada
      if (!expense || (expense.is_recurring && !deleteOption)) {
        return;
      }

      let url;
      let method = 'DELETE';
      let headers = {
        'Authorization': `Bearer ${auth.token}`
      };
      let body = null;

      if (expense.is_recurring) {
        // Para despesas recorrentes, usar a rota específica
        url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}/recurring`;
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ deleteType: deleteOption });
        
        console.log(`Excluindo despesa recorrente com tipo: ${deleteOption}`);
      } 
      else if (expense.has_installments) {
        // Para despesas parceladas
        if (deleteOption === 'all') {
          url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}?delete_all_installments=true`;
        } else {
          url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}`;
        }
      }
      else {
        // Para despesas normais
        url = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expense.id}`;
      }

      console.log('URL de exclusão:', url);
      console.log('Corpo da requisição:', body);

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        throw new Error(`Falha ao excluir despesa: ${errorData.message || 'Erro desconhecido'}`);
      }

      const data = await response.json();
      console.log('Resposta da exclusão:', data);

      // Limpa os estados do modal
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setDeleteOptions({ type: 'single' });
      setDeleteOption(null);

      // Mostra mensagem de sucesso
      toast.success(data.message || 'Despesa excluída com sucesso!');

      // Recarrega a lista de despesas
      await fetchExpenses();
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
      setError('Erro ao excluir despesa. Por favor, tente novamente.');
      toast.error(err.message || 'Erro ao excluir despesa');
    }
  };

  const handleSave = async (expenseData) => {
    try {
      const payload = {
        ...expenseData,
        user_id: auth.user.id
      };

      if (expenseData.is_recurring) {
        payload.start_date = expenseData.expense_date;
        payload.end_date = '2099-12-31';
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${editingExpense ? editingExpense.id : ''}`, {
        method: editingExpense ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar despesa');
      }

      setShowDeleteModal(false);
      setEditingExpense(null);
      fetchExpenses();
      toast.success(editingExpense ? 'Despesa atualizada com sucesso!' : 'Despesa criada com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleDeleteConfirm = async (option) => {
    try {
      if (!expenseToDelete) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${expenseToDelete.id}/recurring`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ deleteType: option })
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir despesa');
      }

      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setDeleteOptions({ type: 'single' });
      setDeleteOption(null);
      fetchExpenses();
      toast.success('Despesa(s) excluída(s) com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir despesa');
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
  };

  const formatSelectedPeriod = (filterType) => {
    switch (filterType) {
      case 'category':
        if (!filters.category) return 'Todas as categorias';
        const selectedCategory = categories.find(c => c.value === filters.category);
        return selectedCategory ? selectedCategory.label : 'Todas as categorias';
      case 'months':
        if (filters.months.length === 0) return 'Selecione os meses';
        if (filters.months.length === months.length) return 'Todos os meses';
        if (filters.months.length === 1) {
          return months.find(m => m.value === filters.months[0])?.label;
        }
        if (filters.months.length > 3) {
          return `${filters.months.length} meses selecionados`;
        }
        return filters.months
          .map(m => months.find(month => month.value === m)?.label)
          .join(', ');
      case 'years':
        if (filters.years.length === 0) return 'Selecione os anos';
        if (filters.years.length === years.length) return 'Todos os anos';
        if (filters.years.length === 1) {
          return filters.years[0].toString();
        }
        if (filters.years.length > 3) {
          return `${filters.years.length} anos selecionados`;
        }
        return filters.years.join(', ');
      case 'paymentMethod':
        const selectedMethod = paymentMethods.find(m => m.value === filters.paymentMethod);
        return selectedMethod ? selectedMethod.label : 'Método de Pagamento';
      case 'hasInstallments':
        const selectedOption = installmentOptions.find(o => o.value === filters.hasInstallments);
        return selectedOption ? selectedOption.label : 'Tipo de Despesa';
      case 'description':
        return filters.description;
      default:
        return 'Selecione um filtro';
    }
  };

  const formatRecurrenceType = (type) => {
    if (!type) return '';
    const types = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      annual: 'Anual'
    };
    return types[type] || '';
  };

  // Procurando a estrutura dos filtros e da busca na tela de despesas
  const filterRowContent = (
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

      <div className={dataTableStyles.filterGroup}>
        <label className={dataTableStyles.filterLabel}>
          <BsFolderSymlink /> Categoria
        </label>
        <div 
          className={`${dataTableStyles.modernSelect} ${openFilter === 'category' ? dataTableStyles.active : ''}`}
          onClick={() => handleFilterClick('category')}
        >
          <div className={dataTableStyles.modernSelectHeader}>
            <span>
              {filters.category === 'all' 
                ? 'Todas as categorias' 
                : categories.find(c => c.id.toString() === filters.category)?.category_name || 'Selecione uma categoria'}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'category' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              <label 
                className={dataTableStyles.modernCheckboxLabel}
                onClick={(e) => {
                  e.preventDefault(); // Prevent default to ensure proper handling
                  handleFilterChange('category', 'all');
                  setOpenFilter(null); // Close dropdown after selection
                }}
              >
                <div className={dataTableStyles.modernCheckbox}>
                  <input
                    type="radio"
                    checked={filters.category === 'all'}
                    className={dataTableStyles.hiddenCheckbox}
                    onChange={() => handleFilterChange('category', 'all')}
                    name="category"
                  />
                  <div className={dataTableStyles.customCheckbox}></div>
                </div>
                <span>Todas as categorias</span>
              </label>
              {categories.map(category => (
                <label 
                  key={category.id} 
                  className={dataTableStyles.modernCheckboxLabel}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to ensure proper handling
                    handleFilterChange('category', category.id.toString());
                    setOpenFilter(null); // Close dropdown after selection
                  }}
                >
                  <div className={dataTableStyles.modernCheckbox}>
                    <input
                      type="radio"
                      checked={filters.category === category.id.toString()}
                      className={dataTableStyles.hiddenCheckbox}
                      onChange={() => handleFilterChange('category', category.id.toString())}
                      name="category"
                    />
                    <div className={dataTableStyles.customCheckbox}></div>
                  </div>
                  <span>{category.category_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={dataTableStyles.filterGroup}>
        <label className={dataTableStyles.filterLabel}>
          <BsWallet2 /> Método de Pagamento
        </label>
        <div 
          className={`${dataTableStyles.modernSelect} ${openFilter === 'paymentMethod' ? dataTableStyles.active : ''}`}
          onClick={() => handleFilterClick('paymentMethod')}
        >
          <div className={dataTableStyles.modernSelectHeader}>
            <span>
              {paymentMethods.find(m => m.value === filters.paymentMethod)?.label || 'Método de Pagamento'}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'paymentMethod' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              {paymentMethods.map(method => (
                <label 
                  key={method.value} 
                  className={dataTableStyles.modernCheckboxLabel}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default to ensure proper handling
                    handleFilterChange('paymentMethod', method.value);
                    setOpenFilter(null); // Close dropdown after selection
                  }}
                >
                  <div className={dataTableStyles.modernCheckbox}>
                    <input
                      type="radio"
                      checked={filters.paymentMethod === method.value}
                      className={dataTableStyles.hiddenCheckbox}
                      onChange={() => handleFilterChange('paymentMethod', method.value)}
                      name="paymentMethod"
                    />
                    <div className={dataTableStyles.customCheckbox}></div>
                  </div>
                  <span>{method.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', flex: '1' }}>
        <div className={dataTableStyles.filterGroup} style={{ flex: '1' }}>
          <label className={dataTableStyles.filterLabel}>
            <BsSearch /> Descrição
          </label>
          <div className={dataTableStyles.searchField}>
            <BsSearch className={dataTableStyles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar por descrição..." 
              value={filters.description} 
              onChange={(e) => handleFilterChange('description', e.target.value)} 
              className={dataTableStyles.searchInput}
            />
          </div>
        </div>
        
        <button
          className={`${dataTableStyles.recurringButton} ${filters.is_recurring === 'true' ? dataTableStyles.active : ''}`}
          onClick={() => handleFilterChange('is_recurring', filters.is_recurring === 'true' ? '' : 'true')}
          title="Mostrar apenas despesas fixas"
          style={{ alignSelf: 'flex-end' }}
        >
          <BsRepeat /> Fixos
        </button>
      </div>
    </div>
  );

  // Add useEffect to load the expense to edit if ID is provided
  useEffect(() => {
    const loadExpenseToEdit = async () => {
      if (id) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${id}`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });

          if (!response.ok) {
            throw new Error('Erro ao carregar despesa');
          }

          const expense = await response.json();
          setEditingExpense(expense);
        } catch (error) {
          console.error('Erro ao carregar despesa:', error);
          toast.error('Erro ao carregar despesa para edição');
          navigate('/expenses');
        }
      }
    };

    loadExpenseToEdit();
  }, [id, auth.token, navigate]);

  // Detectar tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      // Force re-render by updating state only when it changes
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        if (!mobile) {
          setShowFilters(true);
        }
        // Force update by toggling a class on body
        document.body.classList.toggle('desktop-view', !mobile);
        document.body.classList.toggle('mobile-view', mobile);
      }
    };

    // Executar imediatamente ao montar o componente para garantir detecção correta
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const toggleCardDetails = (id) => {
    setExpandedCardDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.loading}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={dataTableStyles.pageContainer}>
      <div className={dataTableStyles.pageHeader}>
        <h1 className={dataTableStyles.pageTitle}>Minhas Despesas</h1>
        <button 
          onClick={() => navigate('/add-expense')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Nova Despesa
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

        <div className={`${dataTableStyles.filtersContainer} ${isMobile && !showFilters ? dataTableStyles.filtersCollapsed : ''} ${isMobile && showFilters ? dataTableStyles.filtersExpanded : ''}`}>
          {filterRowContent}
        </div>

        {selectedExpenses.length > 0 && (
          <div className={dataTableStyles.bulkActions}>
            <button
              onClick={() => handleDeleteClick()}
              className={dataTableStyles.deleteButton}
            >
              <BsTrash /> Excluir {selectedExpenses.length} {selectedExpenses.length === 1 ? 'item' : 'itens'}
            </button>
          </div>
        )}

        {noExpensesMessage ? (
          <div className={dataTableStyles.noDataContainer}>
            <BsCash className={dataTableStyles.noDataIcon} />
            <h3 className={dataTableStyles.noDataMessage}>{noExpensesMessage.message}</h3>
            <p className={dataTableStyles.noDataSuggestion}>{noExpensesMessage.suggestion}</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Only render when isMobile is true */}
            {isMobile ? (
              <>
                <div className={dataTableStyles.mobileCardView}>
                  {expenses.map((expense) => (
                    <div 
                      key={expense.id} 
                      className={dataTableStyles.mobileCard}
                    >
                      {!expense.has_installments && (
                        <div className={dataTableStyles.mobileCardSelect}>
                          <label className={dataTableStyles.checkboxContainer}>
                            <input
                              type="checkbox"
                              checked={selectedExpenses.includes(expense.id)}
                              onChange={(e) => handleSelectExpense(expense.id, e)}
                              className={dataTableStyles.checkbox}
                            />
                            <span className={dataTableStyles.checkmark}></span>
                          </label>
                        </div>
                      )}
                      
                      <div className={dataTableStyles.mobileCardHeader}>
                        <h3 className={dataTableStyles.mobileCardTitle}>{expense.description}</h3>
                        <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.expenseAmount} ${dataTableStyles.mobileCardAmount}`}>
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      
                      <div className={dataTableStyles.mobileCardDetails}>
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Data</span>
                          <span className={dataTableStyles.mobileCardValue}>{formatDate(expense.expense_date)}</span>
                        </div>
                        
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Categoria</span>
                          <span className={dataTableStyles.mobileCardValue}>
                            <BsFolderSymlink style={{color: 'var(--primary-color)'}} />
                            {expense.Category?.category_name}
                          </span>
                        </div>
                        
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Método</span>
                          <span className={dataTableStyles.mobileCardValue}>
                            {expense.payment_method === 'credit_card' ? (
                              <><BsCreditCard2Front style={{color: '#598FFF'}} /> Cartão de Crédito</>
                            ) : expense.payment_method === 'debit_card' ? (
                              <><BsCreditCard2Front style={{color: 'var(--primary-color)'}} /> Cartão de Débito</>
                            ) : expense.payment_method === 'pix' ? (
                              <><BsCurrencyDollar style={{color: '#ffb946'}} /> PIX</>
                            ) : (
                              <><BsCashCoin style={{color: 'var(--primary-color)'}} /> Dinheiro</>
                            )}
                          </span>
                        </div>
                        
                        {expense.has_installments && (
                          <div className={dataTableStyles.mobileCardDetail}>
                            <span className={dataTableStyles.mobileCardLabel}>Parcelas</span>
                            <span className={dataTableStyles.mobileCardValue}>
                              <BsCreditCard2Front style={{color: '#598FFF'}} /> {expense.current_installment}/{expense.total_installments}
                            </span>
                          </div>
                        )}
                        
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Tipo</span>
                          <span className={dataTableStyles.mobileCardValue}>
                            {expense.is_recurring ? (
                              <><BsRepeat style={{color: 'var(--primary-color)'}} /> Despesa fixa</> 
                            ) : expense.has_installments ? (
                              <><BsCreditCard2Front style={{color: '#598FFF'}} /> Parcelado</>
                            ) : (
                              <><BsCurrencyDollar style={{color: 'var(--text-color)'}} /> Pagamento único</>
                            )}
                          </span>
                        </div>
                        
                        {expense.note && (
                          <div className={dataTableStyles.mobileCardDetail}>
                            <span className={dataTableStyles.mobileCardLabel}>Observação</span>
                            <span className={dataTableStyles.mobileCardValue}>{expense.note}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className={dataTableStyles.mobileCardActions}>
                        <div className={dataTableStyles.mobileCardType}>
                          {expense.is_recurring ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                              <BsRepeat /> Fixo
                            </span>
                          ) : expense.has_installments ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentsType}`}>
                              <BsCreditCard2Front /> Parcelado
                            </span>
                          ) : (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCurrencyDollar /> Único
                            </span>
                          )}
                        </div>
                        
                        <div className={dataTableStyles.mobileCardActionButtons}>
                          <button 
                            onClick={() => handleEditClick(expense)} 
                            className={dataTableStyles.actionButton}
                            title="Editar"
                          >
                            <BsPencil />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(expense)} 
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
                <div className={dataTableStyles.tableContainer}>
                  <table className={`${dataTableStyles.table} ${dataTableStyles.mobileTable}`}>
                    <thead>
                      <tr>
                        <th>Seleção</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Pagamento</th>
                        <th>Tipo</th>
                        <th>Parcelas</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => (
                        <tr key={expense.id} className={dataTableStyles.tableRow}>
                          <td data-label="Seleção">
                            <label className={dataTableStyles.checkboxContainer}>
                              <input
                                type="checkbox"
                                checked={selectedExpenses.includes(expense.id)}
                                onChange={(e) => handleSelectExpense(expense.id, e)}
                                className={dataTableStyles.checkbox}
                                disabled={expense.has_installments}
                              />
                              <span className={dataTableStyles.checkmark}></span>
                            </label>
                          </td>
                          <td data-label="Descrição">{expense.description}</td>
                          <td data-label="Valor">
                            <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.expenseAmount}`}>
                              R$ {Number(expense.amount).toFixed(2)}
                            </span>
                          </td>
                          <td data-label="Data">{formatDate(expense.expense_date)}</td>
                          <td data-label="Categoria">{expense.Category?.category_name}</td>
                          <td data-label="Pagamento">
                            {expense.payment_method === 'credit_card' ? (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                                <BsCreditCard2Front /> Crédito
                              </span>
                            ) : expense.payment_method === 'debit_card' ? (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                                <BsCreditCard2Front /> Débito
                              </span>
                            ) : expense.payment_method === 'pix' ? (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                                <BsCurrencyDollar /> Pix
                              </span>
                            ) : (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                                <BsCashCoin /> Dinheiro
                              </span>
                            )}
                          </td>
                          <td data-label="Tipo">
                            {expense.is_recurring ? (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                                <BsRepeat /> Fixo
                              </span>
                            ) : expense.has_installments ? (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentsType}`}>
                                <BsCreditCard2Front /> Parcelado
                              </span>
                            ) : (
                              <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                                <BsCurrencyDollar /> Único
                              </span>
                            )}
                          </td>
                          <td data-label="Parcelas">
                            {expense.has_installments 
                              ? `${expense.current_installment}/${expense.total_installments}`
                              : '-'
                            }
                          </td>
                          <td data-label="Ações">
                            <div className={dataTableStyles.actionButtons}>
                              <button 
                                onClick={() => handleEditClick(expense)} 
                                className={dataTableStyles.actionButton}
                                title="Editar"
                              >
                                <BsPencil />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(expense)} 
                                className={`${dataTableStyles.actionButton} ${dataTableStyles.delete}`}
                                title="Excluir"
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
              </>
            ) : (
              <div className={dataTableStyles.tableContainer}>
                <table className={dataTableStyles.table}>
                  <thead>
                    <tr>
                      <th width="40">
                        <label className={dataTableStyles.checkboxContainer}>
                          <input
                            type="checkbox"
                            checked={selectedExpenses.length === expenses.filter(e => !e.has_installments).length && expenses.length > 0}
                            onChange={handleSelectAll}
                            className={dataTableStyles.checkbox}
                          />
                          <span className={dataTableStyles.checkmark}></span>
                        </label>
                      </th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Pagamento</th>
                      <th>Tipo</th>
                      <th>Parcelas</th>
                      <th width="100">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className={dataTableStyles.tableRow}>
                        <td>
                          <label className={dataTableStyles.checkboxContainer}>
                            <input
                              type="checkbox"
                              checked={selectedExpenses.includes(expense.id)}
                              onChange={(e) => handleSelectExpense(expense.id, e)}
                              className={dataTableStyles.checkbox}
                              disabled={expense.has_installments}
                            />
                            <span className={dataTableStyles.checkmark}></span>
                          </label>
                        </td>
                        <td>{expense.description}</td>
                        <td>
                          <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.expenseAmount}`}>
                            R$ {Number(expense.amount).toFixed(2)}
                          </span>
                        </td>
                        <td>{formatDate(expense.expense_date)}</td>
                        <td>{expense.Category?.category_name}</td>
                        <td>
                          {expense.payment_method === 'credit_card' ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCreditCard2Front /> Crédito
                            </span>
                          ) : expense.payment_method === 'debit_card' ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCreditCard2Front /> Débito
                            </span>
                          ) : expense.payment_method === 'pix' ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCurrencyDollar /> Pix
                            </span>
                          ) : (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCashCoin /> Dinheiro
                            </span>
                          )}
                        </td>
                        <td>
                          {expense.is_recurring ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                              <BsRepeat /> Fixo
                            </span>
                          ) : expense.has_installments ? (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentsType}`}>
                              <BsCreditCard2Front /> Parcelado
                            </span>
                          ) : (
                            <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                              <BsCurrencyDollar /> Único
                            </span>
                          )}
                        </td>
                        <td>
                          {expense.has_installments 
                            ? `${expense.current_installment}/${expense.total_installments}`
                            : '-'
                          }
                        </td>
                        <td>
                          <div className={dataTableStyles.actionButtons}>
                            <button 
                              onClick={() => handleEditClick(expense)} 
                              className={dataTableStyles.actionButton}
                              title="Editar"
                            >
                              <BsPencil />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(expense)} 
                              className={`${dataTableStyles.actionButton} ${dataTableStyles.delete}`}
                              title="Excluir"
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

      {showDeleteModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={`${dataTableStyles.modalContent} ${dataTableStyles.deleteModal}`}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle size={22} className={dataTableStyles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              {deleteOptions.type === 'bulk' ? (
                <div className={dataTableStyles.confirmMessage}>
                  <p>Você está prestes a excluir <strong>{deleteOptions.ids.length}</strong> despesas selecionadas.</p>
                  <p className={dataTableStyles.warningText}>Esta ação não pode ser desfeita.</p>
                </div>
              ) : (
                <div className={dataTableStyles.confirmMessage}>
                  <p>
                    Deseja excluir a despesa <strong>{expenseToDelete?.description}</strong>?
                  </p>
                  <p className={dataTableStyles.warningText}>Esta ação não pode ser desfeita.</p>
                </div>
              )}
              
              {expenseToDelete?.is_recurring && (
                <div className={dataTableStyles.optionsContainer}>
                  <div className={dataTableStyles.optionHeader}>
                    <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                      <BsRepeat size={14} /> Despesa fixa mensal
                    </div>
                  </div>
                  
                  <div className={dataTableStyles.optionsList}>
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'single' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="single" 
                          checked={deleteOption === 'single'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Apenas esta ocorrência</span>
                        <span className={dataTableStyles.optionDescription}>
                          Somente esta despesa específica será excluída
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'future' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="future" 
                          checked={deleteOption === 'future'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Esta e todas as futuras</span>
                        <span className={dataTableStyles.optionDescription}>
                          Esta ocorrência e todas as próximas serão excluídas
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'all' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="all" 
                          checked={deleteOption === 'all'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Todas as ocorrências</span>
                        <span className={dataTableStyles.optionDescription}>
                          Todas (passadas e futuras) serão excluídas
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {expenseToDelete?.has_installments && (
                <div className={dataTableStyles.optionsContainer}>
                  <div className={dataTableStyles.optionHeader}>
                    <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentsType}`}>
                      <BsCreditCard2Front size={14} /> Despesa parcelada
                    </div>
                  </div>
                  
                  <div className={dataTableStyles.optionsList}>
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'single' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="single" 
                          checked={deleteOption === 'single'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Apenas esta parcela</span>
                        <span className={dataTableStyles.optionDescription}>
                          Somente a parcela {expenseToDelete?.current_installment}/{expenseToDelete?.total_installments} será excluída
                        </span>
                      </div>
                    </label>
                    
                    <label className={`${dataTableStyles.optionItem} ${deleteOption === 'all' ? dataTableStyles.optionSelected : ''}`}>
                      <div className={dataTableStyles.optionRadio}>
                        <input 
                          type="radio" 
                          name="deleteType" 
                          value="all" 
                          checked={deleteOption === 'all'} 
                          onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <div className={dataTableStyles.customRadio}></div>
                      </div>
                      <div className={dataTableStyles.optionContent}>
                        <span className={dataTableStyles.optionTitle}>Todas as parcelas</span>
                        <span className={dataTableStyles.optionDescription}>
                          Todas as {expenseToDelete?.total_installments} parcelas serão excluídas
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className={dataTableStyles.modalActions}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setExpenseToDelete(null);
                  setDeleteOptions({ type: 'single' });
                  setDeleteOption(null);
                }} 
                className={dataTableStyles.secondaryButton}
              >
                <BsX size={18} /> Cancelar
              </button>
              <button 
                onClick={() => {
                  if (deleteOptions.type === 'bulk') {
                    handleDelete({ id: 'bulk' });
                  } else if (expenseToDelete) {
                    handleDelete(expenseToDelete);
                  }
                }}
                className={`${dataTableStyles.primaryButton} ${dataTableStyles.deleteButton}`}
                disabled={expenseToDelete?.is_recurring && !deleteOption}
              >
                <BsTrash size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          onSave={handleSave}
          onCancel={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
};

export default Expenses;