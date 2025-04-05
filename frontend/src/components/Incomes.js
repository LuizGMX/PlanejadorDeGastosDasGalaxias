import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import sharedStyles from '../styles/shared.module.css';
import EditIncomeForm from './EditIncomeForm';
import { toast } from 'react-hot-toast';
import { 
  BsPlusLg, 
  BsCashCoin, 
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
  BsFolderSymlink,
  BsCheck2,
  BsXLg,
  BsChevronDown,
  BsChevronUp
} from 'react-icons/bs';

const Incomes = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    category: 'all',
    description: '',
    is_recurring: ''
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    type: 'single'
  });
  const [noIncomesMessage, setNoIncomesMessage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [showFilters, setShowFilters] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [activeSwipeCard, setActiveSwipeCard] = useState(null);
  const [expandedCardDetails, setExpandedCardDetails] = useState({});

  const years = Array.from(
    { length: 11 },
    (_, i) => ({
      value: 2023 + i,
      label: (2023 + i).toString()
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/incomes/categories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/banks/favorites`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          })
        ]);

        if (!categoriesResponse.ok || !banksResponse.ok) {
          throw new Error('Erro ao carregar dados');
        }

        const [categoriesData, banksData] = await Promise.all([
          categoriesResponse.json(),
          banksResponse.json()
        ]);

        setCategories(categoriesData);
        setBanks(banksData);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Erro ao carregar dados. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  useEffect(() => {
    fetchIncomes();
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

  // Detectar tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log('Is mobile:', mobile);
      if (!mobile) {
        setShowFilters(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ajustar posição do botão de filtro
  useEffect(() => {
    if (isMobile) {
      const filterButton = document.querySelector(`.${dataTableStyles.filterToggleButton}`);
      if (filterButton) {
        filterButton.style.position = 'sticky';
        filterButton.style.top = '0';
        filterButton.style.marginTop = '-8px';
        filterButton.style.marginBottom = '16px';
        filterButton.style.zIndex = '20';
        filterButton.style.width = '100%';
        filterButton.style.display = 'flex';
        filterButton.style.alignItems = 'center';
        filterButton.style.justifyContent = 'center';
        filterButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
      }

      const dataContainer = document.querySelector(`.${dataTableStyles.dataContainer}`);
      if (dataContainer) {
        dataContainer.style.paddingTop = '8px';
      }
      
      // Resetar style do container de filtros para garantir que não interfira
      const filtersContainer = document.querySelector(`.${dataTableStyles.filtersContainer}`);
      if (filtersContainer) {
        filtersContainer.style.display = !showFilters ? 'none' : 'flex';
        filtersContainer.style.flexDirection = 'column';
      }
    }
  }, [isMobile, showFilters, dataTableStyles]);

  const fetchIncomes = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      filters.months.forEach(month => queryParams.append('months[]', month));
      filters.years.forEach(year => queryParams.append('years[]', year));
      
      if (filters.category !== 'all') {
        queryParams.append('category_id', filters.category);
      }
      if (filters.description) {
        queryParams.append('description', filters.description);
      }
      if (filters.is_recurring !== '') {
        queryParams.append('is_recurring', filters.is_recurring);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/incomes?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar receitas');
      }

      const data = await response.json();
      setIncomes(data.incomes || []);
      setSelectedIncomes([]);

      if (!data.incomes || data.incomes.length === 0) {
        const hasActiveFilters = filters.months.length !== 1 || 
                               filters.years.length !== 1 || 
                               filters.category !== 'all' || 
                               filters.description !== '' || 
                               filters.is_recurring !== '';

        setNoIncomesMessage(hasActiveFilters ? {
          message: 'Nenhum ganho encontrado para os filtros selecionados.',
          suggestion: 'Tente ajustar os filtros para ver mais resultados.'
        } : {
          message: 'Você ainda não tem receitas cadastrados para este período.',
          suggestion: 'Que tal começar adicionando seu primeiro ganho?'
        });
      } else {
        setNoIncomesMessage(null);
      }
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
      setError('Erro ao carregar receitas. Por favor, tente novamente.');
    }
  };

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

    if (type === 'category') {
      setFilters(prev => ({ ...prev, category: value }));
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Seleciona todas as receitas
      const allIncomeIds = incomes.map(income => income.id);
      setSelectedIncomes(allIncomeIds);
    } else {
      setSelectedIncomes([]);
    }
  };

  const handleSelectIncome = (id, e) => {
    if (e.target.checked) {
      setSelectedIncomes(prev => [...prev, id]);
    } else {
      setSelectedIncomes(prev => prev.filter(incomeId => incomeId !== id));
    }
  };

  const handleEditClick = (income) => {
    setEditingIncome(income);
  };

  const handleDeleteClick = (income = null) => {
    if (income) {
    setIncomeToDelete(income);
      setDeleteOptions({
        type: income.is_recurring ? 'single' : 'single'
      });
    } else {
      // Deleção em massa
      setIncomeToDelete(null);
      setDeleteOptions({
        type: 'bulk',
        ids: selectedIncomes
      });
    }
    setShowDeleteModal(true);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
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

  const handleDelete = async (income) => {
    try {
      console.log('Tentando excluir:', income);
      console.log('Opções de exclusão:', deleteOptions);

      if (!incomeToDelete && !deleteOptions.type === 'bulk') {
        console.error('Nenhuma receita selecionada para excluir');
        return;
      }

      if (deleteOptions.type === 'bulk') {
        console.log('Excluindo em massa:', selectedIncomes);
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/incomes/bulk`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({ ids: selectedIncomes })
        });

        const responseData = await response.text();
        console.log('Resposta do servidor (bulk):', responseData);

        if (!response.ok) {
          throw new Error('Falha ao excluir receitas em massa');
        }

        // Limpa os estados do modal
        setShowDeleteModal(false);
        setIncomeToDelete(null);
        setDeleteOptions({ type: 'single' });
        setSelectedIncomes([]);

        // Recarrega a lista de receitas
        await fetchIncomes();
        
        toast.success(`${selectedIncomes.length} ganho(s) excluído(s) com sucesso!`);
        return;
      }

      // Exclusão de um único item
      const incomeId = incomeToDelete.id;
      
      if (!incomeId) {
        throw new Error('ID do ganho não encontrado');
      }

      let url = `${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/incomes/${incomeId}`;
      
      // Adicionar parâmetro para excluir futuros se necessário
      if (deleteOptions.type === 'all' && incomeToDelete.is_recurring) {
        url += '?delete_future=true';
      }

      console.log('URL de exclusão:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      const responseData = await response.text();
      console.log('Resposta do servidor (single):', responseData);

      if (!response.ok) {
        throw new Error('Falha ao excluir ganho');
      }

      // Limpa os estados do modal
      setShowDeleteModal(false);
      setIncomeToDelete(null);
      setDeleteOptions({ type: 'single' });

      // Recarrega a lista de receitas
      await fetchIncomes();
      
      toast.success('Ganho excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir ganho:', err);
      toast.error(`Erro ao excluir ganho: ${err.message}`);
      setShowDeleteModal(false);
    }
  };

  const handleSave = async (incomeData) => {
    try {
      console.log('Salvando ganho com dados:', incomeData);
      
      const payload = {
        ...incomeData,
        user_id: auth.user.id
      };

      // Garantir que todos os IDs sejam numéricos
      if (payload.category_id) payload.category_id = Number(payload.category_id);
      if (payload.bank_id) payload.bank_id = Number(payload.bank_id);
      
      // Garantir que o valor seja um número
      if (typeof payload.amount === 'string') {
        payload.amount = parseFloat(payload.amount.replace(/[^0-9.-]+/g, ''));
      }

      // Garantir que as datas estejam corretas
      if (incomeData.is_recurring) {
        payload.start_date = incomeData.start_date || incomeData.date;
        payload.end_date = incomeData.end_date || '2099-12-31';
      }

      console.log('Payload final sendo enviado:', payload);

      // Determinar se é uma atualização ou criação
      const isUpdate = Boolean(incomeData.id);
      const url = `${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/incomes${isUpdate ? `/${incomeData.id}` : ''}`;
      
      console.log('URL da requisição:', url, 'Método:', isUpdate ? 'PUT' : 'POST');

      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.text();
      console.log('Resposta do servidor:', responseData);

      if (!response.ok) {
        throw new Error('Erro ao salvar ganho');
      }

      setEditingIncome(null);
      fetchIncomes();
      toast.success(isUpdate ? 'Ganho atualizado com sucesso!' : 'Ganho criado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar ganho:', error);
      toast.error(`Erro ao salvar ganho: ${error.message}`);
    }
  };

  // Funções para manipulação de gestos de toque
  const handleTouchStart = (id, e) => {
    setTouchStartX(e.targetTouches[0].clientX);
    // Fechamos qualquer cartão aberto que não seja este
    if (activeSwipeCard && activeSwipeCard !== id) {
      setActiveSwipeCard(null);
    }
  };

  const handleTouchMove = (id, e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (id) => {
    const swipeThreshold = 100; // pixels mínimos para considerar um swipe
    const diff = touchStartX - touchEndX;
    
    // Se deslizou da direita para a esquerda (diff positivo) além do threshold, ativamos o swipe
    if (diff > swipeThreshold) {
      setActiveSwipeCard(id);
    } 
    // Se deslizou da esquerda para a direita (diff negativo) além do threshold, fechamos o swipe
    else if (diff < -swipeThreshold && activeSwipeCard === id) {
      setActiveSwipeCard(null);
    }
    
    // Resetamos os valores de toque
    setTouchStartX(0);
    setTouchEndX(0);
  };

  const toggleCardDetails = (id) => {
    setExpandedCardDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Função auxiliar para renderizar visualização mobile como cards
  const renderMobileCards = () => {
    return (
      <div className={dataTableStyles.mobileCardView}>
        {incomes.map((income) => {
          const isExpanded = expandedCardDetails[income.id];
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
                
                <div className={dataTableStyles.mobileCardHeader}>
                  <h3 className={dataTableStyles.mobileCardTitle}>{income.description}</h3>
                  <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.incomeAmount} ${dataTableStyles.mobileCardAmount}`}>
                    R$ {Number(income.amount).toFixed(2)}
                  </span>
                </div>
                
                <div className={dataTableStyles.mobileCardDetails}>
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Data</span>
                    <span className={dataTableStyles.mobileCardValue}>{formatDate(income.date)}</span>
                  </div>
                  
                  <div className={dataTableStyles.mobileCardDetail}>
                    <span className={dataTableStyles.mobileCardLabel}>Categoria</span>
                    <span className={dataTableStyles.mobileCardValue}>{income.Category?.category_name}</span>
                  </div>
                  
                  {!isExpanded ? (
                    <>
                      <div className={dataTableStyles.mobileCardDetail}>
                        <span className={dataTableStyles.mobileCardLabel}>Banco</span>
                        <span className={dataTableStyles.mobileCardValue}>{income.Bank?.name || '-'}</span>
                      </div>
                      
                      {income.is_recurring && (
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Recorrência</span>
                          <span className={dataTableStyles.mobileCardValue}>
                            {formatRecurrenceType(income.recurrence_type)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={dataTableStyles.mobileCardDetail}>
                        <span className={dataTableStyles.mobileCardLabel}>Banco</span>
                        <span className={dataTableStyles.mobileCardValue}>{income.Bank?.name || '-'}</span>
                      </div>
                      
                      <div className={dataTableStyles.mobileCardDetail}>
                        <span className={dataTableStyles.mobileCardLabel}>Tipo</span>
                        <span className={dataTableStyles.mobileCardValue}>
                          {income.is_recurring ? 'Receita fixa' : 'Receita única'}
                        </span>
                      </div>
                      
                      {income.is_recurring && (
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Recorrência</span>
                          <span className={dataTableStyles.mobileCardValue}>
                            {formatRecurrenceType(income.recurrence_type)}
                          </span>
                        </div>
                      )}
                      
                      {income.note && (
                        <div className={dataTableStyles.mobileCardDetail}>
                          <span className={dataTableStyles.mobileCardLabel}>Observação</span>
                          <span className={dataTableStyles.mobileCardValue}>{income.note}</span>
                        </div>
                      )}
                    </>
                  )}
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
                      onClick={() => handleEditClick(income)}
                      className={dataTableStyles.actionButton}
                      title="Editar"
                    >
                      <BsPencil />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(income)}
                      className={`${dataTableStyles.actionButton} ${dataTableStyles.delete}`}
                      title="Excluir"
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
                
                <button 
                  className={dataTableStyles.mobileCardDetailToggle}
                  onClick={() => toggleCardDetails(income.id)}
                >
                  {isExpanded ? (
                    <>Mostrar Menos <BsChevronUp /></>
                  ) : (
                    <>Mostrar Mais <BsChevronDown /></>
                  )}
                </button>
              </div>
              
              <div className={dataTableStyles.mobileCardSwipeActions}>
                <div 
                  className={dataTableStyles.mobileCardSwipeEdit}
                  onClick={() => handleEditClick(income)}
                >
                  <BsPencil size={20} />
                </div>
                <div 
                  className={dataTableStyles.mobileCardSwipeDelete}
                  onClick={() => handleDeleteClick(income)}
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

  // Extrair o conteúdo do filtro para uma variável, assim como em Expenses.js
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
                : categories.find(c => c.id === Number(filters.category))?.category_name || 'Selecione uma categoria'}
            </span>
            <span className={dataTableStyles.arrow}>▼</span>
          </div>
          {openFilter === 'category' && (
            <div className={dataTableStyles.modernSelectDropdown}>
              <label 
                className={dataTableStyles.modernCheckboxLabel}
                onClick={(e) => {
                  handleCheckboxClick(e);
                  handleFilterChange('category', 'all');
                }}
              >
                <div className={dataTableStyles.modernCheckbox}>
                  <input
                    type="radio"
                    checked={filters.category === 'all'}
                    className={dataTableStyles.hiddenCheckbox}
                    readOnly
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
                    handleCheckboxClick(e);
                    handleFilterChange('category', category.id.toString());
                  }}
                >
                  <div className={dataTableStyles.modernCheckbox}>
                    <input
                      type="radio"
                      checked={filters.category === category.id.toString()}
                      className={dataTableStyles.hiddenCheckbox}
                      readOnly
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

      {incomes.length > 0 && (
        <div className={dataTableStyles.filterSummary}>
          Total de receitas para os filtros selecionados: 
          <strong className={dataTableStyles.incomeAmount}>
            R$ {incomes.reduce((sum, income) => sum + Number(income.amount), 0).toFixed(2)}
          </strong>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={dataTableStyles.pageContainer}>
        <div className={dataTableStyles.loadingContainer}>
          <p className={dataTableStyles.loadingText}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={dataTableStyles.pageContainer}>
        <div className={dataTableStyles.errorContainer}>
          <p className={dataTableStyles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={dataTableStyles.pageContainer}>
      <div className={dataTableStyles.pageHeader}>
        <h1 className={dataTableStyles.pageTitle}>Minhas Receitas</h1>
        <button 
          onClick={() => navigate('/add-income')} 
          className={dataTableStyles.addButton}
        >
          <BsPlusLg size={16} /> Nova Receita
        </button>
      </div>

      <div className={dataTableStyles.dataContainer}>
        {isMobile && (
          <div style={{ width: '100%', display: 'block', position: 'relative', marginTop: '-8px', marginBottom: '16px' }}>
            <button 
              className={dataTableStyles.filterToggleButton} 
              onClick={() => {
                setShowFilters(!showFilters);
                console.log('Show filters:', !showFilters);
              }}
            >
              <BsFilter size={16} /> 
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              {showFilters ? <BsChevronUp /> : <BsChevronDown />}
            </button>
          </div>
        )}

        <div className={`${dataTableStyles.filtersContainer} ${isMobile && !showFilters ? dataTableStyles.filtersCollapsed : ''} ${isMobile && showFilters ? dataTableStyles.filtersExpanded : ''}`} style={isMobile ? { display: showFilters ? 'flex' : 'none', flexDirection: 'column' } : {}}>
          {filterRowContent}
        </div>

        {selectedIncomes.length > 0 && (
          <div className={dataTableStyles.bulkActions}>
            <button
              className={dataTableStyles.deleteButton}
              onClick={() => handleDeleteClick()}
            >
              <BsTrash /> Excluir {selectedIncomes.length} {selectedIncomes.length === 1 ? 'item' : 'itens'}
            </button>
          </div>
        )}

        {noIncomesMessage ? (
          <div className={dataTableStyles.noDataContainer}>
            <BsCashCoin className={dataTableStyles.noDataIcon} />
            <h3 className={dataTableStyles.noDataMessage}>{noIncomesMessage.message}</h3>
            <p className={dataTableStyles.noDataSuggestion}>{noIncomesMessage.suggestion}</p>
          </div>
        ) : (
          <>
            {renderMobileCards()}
            <div className={dataTableStyles.tableContainer}>
              <table className={dataTableStyles.table}>
                <thead>
                  <tr>
                    <th width="40">
                      <label className={dataTableStyles.checkboxContainer}>
                        <input
                          type="checkbox"
                          checked={selectedIncomes.length === incomes.length && incomes.length > 0}
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
                    <th>Banco</th>
                    <th>Tipo</th>
                    <th>Recorrência</th>
                    <th width="100">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr key={income.id} className={dataTableStyles.tableRow}>
                      <td>
                        <label className={dataTableStyles.checkboxContainer}>
                          <input
                            type="checkbox"
                            checked={selectedIncomes.includes(income.id)}
                            onChange={(e) => handleSelectIncome(income.id, e)}
                            className={dataTableStyles.checkbox}
                          />
                          <span className={dataTableStyles.checkmark}></span>
                        </label>
                      </td>
                      <td>{income.description}</td>
                      <td>
                        <span className={`${dataTableStyles.amountBadge} ${dataTableStyles.incomeAmount}`}>
                          R$ {Number(income.amount).toFixed(2)}
                        </span>
                      </td>
                      <td>{formatDate(income.date)}</td>
                      <td>{income.Category?.category_name}</td>
                      <td>{income.Bank?.name || '-'}</td>
                      <td>
                        {income.is_recurring ? (
                          <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                            <BsRepeat /> Fixo
                          </span>
                        ) : (
                          <span className={`${dataTableStyles.typeStatus} ${dataTableStyles.oneTimeType}`}>
                            <BsCurrencyDollar /> Único
                          </span>
                        )}
                      </td>
                      <td>{income.is_recurring ? formatRecurrenceType(income.recurrence_type) : '-'}</td>
                      <td>
                        <div className={dataTableStyles.actionButtons}>
                          <button
                            onClick={() => handleEditClick(income)}
                            className={dataTableStyles.actionButton}
                            title="Editar"
                          >
                            <BsPencil />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(income)}
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
        )}
      </div>

      {showDeleteModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={dataTableStyles.modalContent}>
            <div className={dataTableStyles.modalHeader}>
              <BsExclamationTriangle />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              <p className={dataTableStyles.modalMessage}>
                Tem certeza que deseja excluir o ganho <strong>{incomeToDelete?.description}</strong>?
              </p>
              
              {incomeToDelete?.is_recurring && (
                <div>
                  <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`} style={{ marginBottom: '12px' }}>
                    <BsRepeat /> Este é um ganho fixo
                  </div>
                  
                  <div onChange={(e) => setDeleteOptions({ ...deleteOptions, type: e.target.value })} 
                       style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="radio" name="deleteType" value="single" checked={deleteOptions.type === 'single'} />
                      <span>Excluir apenas este ganho específico</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="radio" name="deleteType" value="all" checked={deleteOptions.type === 'all'} />
                      <span>Excluir este e todos os receitas futuros desta série</span>
                    </label>
                  </div>
                </div>
              )}
              
              {deleteOptions.type === 'bulk' && (
                <div>
                  <p className={dataTableStyles.modalMessage}>
                    Serão excluídos <strong>{deleteOptions.ids.length}</strong> receitas.
                  </p>
                </div>
              )}
            </div>
            <div className={dataTableStyles.modalActions}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setIncomeToDelete(null);
                  setDeleteOptions({ type: 'single' });
                }} 
                className={dataTableStyles.cancelButton}
              >
                <BsXLg /> Cancelar
              </button>
              <button
                onClick={() => handleDelete(incomeToDelete)} 
                className={dataTableStyles.confirmButton}
              >
                <BsCheck2 /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {editingIncome && (
        <EditIncomeForm
          income={editingIncome}
          onSave={handleSave}
          onCancel={() => setEditingIncome(null)}
        />
      )}
    </div>
  );
};

export default Incomes; 