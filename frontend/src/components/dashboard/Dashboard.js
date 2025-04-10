import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { BarChart, PieChart, LineChart, ResponsiveContainer } from '../charts';
import styles from '../../styles/dashboard.module.css';
import { FaChartLine, FaChevronDown} from 'react-icons/fa';
import DateRangePicker from '../shared/DateRangePicker';

import { 
  BsPlusLg, 
  BsCash,  
  BsPencil, 
  BsEye,
} from 'react-icons/bs';

const motivationalPhrases = [
  "Cuide do seu dinheiro hoje para não precisar se preocupar amanhã.",
  "Cada real economizado é um passo mais perto da sua liberdade financeira.",
  "Não trabalhe apenas por dinheiro, faça o dinheiro trabalhar para você.",
  "Investir é plantar hoje para colher no futuro.",
  "Quem controla seu dinheiro, controla seu futuro.",
  "Gaste menos do que ganha e invista a diferença.",
  "Disciplina financeira hoje significa tranquilidade amanhã.",
  "Pequenos despesas diárias podem se tornar grandes perdas anuais.",
  "A riqueza começa na sua mentalidade antes de chegar à sua conta bancária.",
  "Orçamento não é prisão, é liberdade.",
  "Dinheiro é um ótimo servo, mas um péssimo mestre.",
  "O segredo da riqueza está nos hábitos diários.",
  "Cada centavo tem um propósito – dê um destino certo ao seu dinheiro.",
  "A prosperidade começa com escolhas inteligentes.",
  "Seja dono do seu dinheiro antes que ele seja dono de você."
];


const getGreeting = (userName) => {
  const hour = new Date().getHours();
  let greeting = '';
  
  if (hour >= 5 && hour < 12) {
    greeting = 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
  } else {
    greeting = 'Boa noite';
  }

  const randomPhrase = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
  
  return (
    <div className={styles.greeting}>
      <div className={styles.greetingContent}>
      <h2>{greeting}, {userName}!</h2>
        <p className={styles.motivationalPhrase}>"{randomPhrase}"</p>
      </div>
      <div className={styles.greetingDate}>
        <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
  );
};

const BankBalanceTrend = ({ showTitle = true, showControls = true, height = 300, containerStyle = {} }) => {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectionMonths, setProjectionMonths] = useState(3);
  const [activeDot, setActiveDot] = useState(null);
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_PREFIX}/dashboard/bank-balance-trend?months=${projectionMonths}`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Falha ao carregar dados da projeção');
        }

        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, projectionMonths]);

  if (loading) return <div className={styles.loadingCard}>
    <div className={styles.loadingSpinner}></div>
    <p>Carregando projeção financeira...</p>
  </div>;
  
  if (error) return <div className={styles.errorCard}>
    <span className={styles.errorIcon}>⚠️</span>
    <p>Erro: {error}</p>
    <button onClick={() => setLoading(true)}>Tentar novamente</button>
  </div>;
  
  if (!data) return null;

  const formatFullCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Generate financial insights based on the projection data
  const generateInsights = () => {
    // Check if there's a significant gap between income and expenses
    const latestMonth = data.projectionData[0];
    const incomeToExpenseRatio = latestMonth.receitas / (latestMonth.despesas || 1);
    
    if (incomeToExpenseRatio < 1.1) {
      return "⚠️ Seus despesas estão próximos da sua renda. Considere reduzir despesas não essenciais.";
    } else if (incomeToExpenseRatio > 1.5) {
      return "✅ Você está economizando bem! Considere investir o excedente para futuro crescimento.";
    } else {
      return "ℹ️ Sua relação entre receitas e despesas está equilibrada. Continue monitorando seus despesas.";
    }
  };
  
  // Get trend direction for projections
  const getTrendDirection = () => {
    if (data.projectionData.length < 2) return null;
    
    const lastMonth = data.projectionData[data.projectionData.length - 1];
    const firstMonth = data.projectionData[0];
    
    if (lastMonth.saldo > firstMonth.saldo) {
      return {
        direction: "up",
        percentage: ((lastMonth.saldo - firstMonth.saldo) / Math.abs(firstMonth.saldo || 1) * 100).toFixed(1)
      };
    } else if (lastMonth.saldo < firstMonth.saldo) {
      return {
        direction: "down",
        percentage: ((firstMonth.saldo - lastMonth.saldo) / Math.abs(firstMonth.saldo || 1) * 100).toFixed(1)
      };
    } else {
      return {
        direction: "stable",
        percentage: 0
      };
    }
  };
  
  const trend = getTrendDirection();
  const insight = generateInsights();

  const handleDotClick = (dataIndex) => {
    setActiveDot(activeDot === dataIndex ? null : dataIndex);
  };
  
  const handleMouseEnter = (data, index) => {
    setActiveDot(index);
  };
  
  const handleMouseLeave = () => {
    setActiveDot(null);
  };

  return (
    <div style={containerStyle} className={`${styles.trendChartContainer} ${styles.enhancedCard}`}>
      {showTitle && (
        <div className={styles.trendChartHeader}>
          <h2 className={styles.trendChartTitle}>Projeção de Saldo</h2>
          <button 
            className={styles.tipsToggle}
            onClick={() => setShowTips(!showTips)}
            title={showTips ? "Ocultar dicas" : "Mostrar dicas"}
          >
            {showTips ? "🔍" : "💡"}
          </button>
        </div>
      )}
      
      {showTips && (
        <div className={styles.insightCard}>
          <p>{insight}</p>
          {trend && (
            <div className={styles.trendIndicator}>
              <span>Tendência: </span>
              {trend.direction === "up" ? (
                <span className={styles.trendUp}>↗️ +{trend.percentage}%</span>
              ) : trend.direction === "down" ? (
                <span className={styles.trendDown}>↘️ -{trend.percentage}%</span>
              ) : (
                <span className={styles.trendStable}>→ Estável</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {showControls && (
        <div className={styles.trendChartControls}>
          <div className={styles.controlGroup}>
            <label>Período de Projeção: </label>
            <div className={styles.buttonSelector}>
              <button 
                className={projectionMonths === 3 ? styles.active : ''}
                onClick={() => setProjectionMonths(3)}
              >
                3 meses
              </button>
              <button 
                className={projectionMonths === 6 ? styles.active : ''}
                onClick={() => setProjectionMonths(6)}
              >
                6 meses
              </button>
              <button 
                className={projectionMonths === 12 ? styles.active : ''}
                onClick={() => setProjectionMonths(12)}
              >
                12 meses
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.trendChartSummary}>
        <div className={styles.trendChartSummaryItem}>
          <span>Receitas Projetados </span>
          <strong className={styles.positive}>
            {formatFullCurrency(data.summary.totalProjectedIncomes)}
          </strong>
        </div>
        <div className={styles.trendChartSummaryItem}>
          <span>Despesas Projetadas </span>
          <strong className={styles.negative}>
            {formatFullCurrency(data.summary.totalProjectedExpenses)}
          </strong>
        </div>
        <div className={styles.trendChartSummaryItem}>
          <span>Saldo Final Projetado </span>
          <strong className={data.summary.finalBalance >= 0 ? styles.positive : styles.negative}>
            {formatFullCurrency(data.summary.finalBalance)}
          </strong>
        </div>
      </div>
      
      {activeDot !== null && (
        <div className={styles.monthDetailCard}>
          <h4>Detalhe do Mês</h4>
          <div className={styles.monthDetail}>
            {data.projectionData[activeDot] && (
              <>
                <div className={styles.detailRow}>
                  <span>Mês:</span>
                  <strong>
                    {(() => {
                      const d = new Date(data.projectionData[activeDot].date);
                      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      return `${months[d.getMonth()]} de ${d.getFullYear()}`;
                    })()}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Receitas:</span>
                  <strong className={styles.positive}>
                    {formatFullCurrency(data.projectionData[activeDot].receitas)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Despesas:</span>
                  <strong className={styles.negative}>
                    {formatFullCurrency(data.projectionData[activeDot].despesas)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Saldo:</span>
                  <strong className={data.projectionData[activeDot].saldo >= 0 ? styles.positive : styles.negative}>
                    {formatFullCurrency(data.projectionData[activeDot].saldo)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Economia:</span>
                  <strong>
                    {((data.projectionData[activeDot].receitas - data.projectionData[activeDot].despesas) / 
                      data.projectionData[activeDot].receitas * 100).toFixed(1)}% da renda
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// New component for Financial Health Score
const FinancialHealthScore = ({ data }) => {
  if (!data) return null;
  
  // Calculate a financial health score based on various factors
  const calculateHealthScore = () => {
    let score = 70; // Start with a baseline score
    
    // Factor 1: Income vs Expenses ratio
    const incomeExpenseRatio = data.total_incomes / (data.total_expenses || 1);
    if (incomeExpenseRatio > 1.5) score += 10;
    else if (incomeExpenseRatio > 1.2) score += 5;
    else if (incomeExpenseRatio < 1) score -= 10;
    
    // Factor 2: Budget adherence
    if (data.budget_info) {
      if (data.budget_info.percentage_spent > 100) score -= 15;
      else if (data.budget_info.percentage_spent > 90) score -= 5;
      else if (data.budget_info.percentage_spent < 80) score += 5;
    }
    
    // Factor 3: Financial Goal progress
    if (data.financial_goal) {
      if (data.financial_goal.is_achievable) score += 10;
      else score -= 5;
    }
    
    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  };
  
  const healthScore = calculateHealthScore();
  let healthStatus, healthColor;
  
  if (healthScore >= 80) {
    healthStatus = "Excelente";
    healthColor = "var(--success-color)";
  } else if (healthScore >= 60) {
    healthStatus = "Bom";
    healthColor = "#4CAF50";
  } else if (healthScore >= 40) {
    healthStatus = "Regular";
    healthColor = "#FFC107";
  } else if (healthScore >= 20) {
    healthStatus = "Atenção";
    healthColor = "#FF9800";
  } else {
    healthStatus = "Crítico";
    healthColor = "var(--error-color)";
  }
  
  // Generate personalized financial tips based on the score
  const getFinancialTips = () => {
    if (healthScore < 40) {
      return [
        "Revise seus despesas essenciais e corte despesas supérfluas",
        "Estabeleça um orçamento mais rígido para o próximo mês",
        "Considere fontes de renda adicionais"
      ];
    } else if (healthScore < 70) {
      return [
        "Continue acompanhando seus despesas de perto",
        "Tente aumentar sua taxa de poupança mensal",
        "Avalie seus investimentos atuais"
      ];
    } else {
      return [
        "Considere aumentar seus investimentos a longo prazo",
        "Verifique se sua reserva de emergência está adequada",
        "Planeje objetivos financeiros mais ambiciosos"
      ];
    }
  };
  
  const tips = getFinancialTips();
  
  return (
    <div className={styles.healthScoreContainer}>
      <div className={styles.healthScoreHeader}>
        <h3>Saúde Financeira</h3>
        <div className={styles.scoreValue} style={{ color: healthColor }}>
          {healthScore}
          <span>/100</span>
        </div>
      </div>
      
      <div className={styles.healthScoreBar}>
        <div 
          className={styles.healthScoreProgress} 
          style={{ width: `${healthScore}%`, backgroundColor: healthColor }}
        />
      </div>
      
      <div className={styles.healthStatus}>
        Status: <span style={{ color: healthColor }}>{healthStatus}</span>
      </div>
      
      <div className={styles.healthTips}>
        <h4>Dicas Personalizadas:</h4>
        <ul>
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Improved filter selectors
const FilterSelector = ({ label, options, selected, onSelect, multiple = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(null);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelect = (value) => {
    if (multiple) {
      const newSelected = selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value];
      onSelect(newSelected);
    } else {
      onSelect(value);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (multiple) {
      // Verifica se todos estão selecionados e alterna entre todos/nenhum
      const allSelected = selected.length === options.length && 
                          options.every(opt => selected.includes(opt.value));
      onSelect(allSelected ? [] : options.map(opt => opt.value));
    }
  };

  const getDisplayText = () => {
    if (multiple) {
      if (selected.length === 0) return 'Selecione...';
      if (selected.length === options.length) return 'Todos selecionados';
      return `${selected.length} selecionados`;
    }
    const selectedOption = options.find(opt => opt.value === selected);
    return selectedOption ? selectedOption.label : 'Selecione...';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.filterSelector} ref={filterRef}>
      <div className={styles.filterLabel}>{label}</div>
      <div 
        className={`${styles.filterDisplay} ${isOpen ? styles.active : ''}`}
        onClick={handleToggle}
      >
        <span>{getDisplayText()}</span>
        <FaChevronDown className={`${styles.arrowIcon} ${isOpen ? styles.rotated : ''}`} />
      </div>
      {isOpen && (
        <div className={styles.filterOptions}>
          {multiple && (
            <>
              <div className={styles.selectAllOption} onClick={handleSelectAll}>
                <input 
                  type="checkbox" 
                  checked={selected.length === options.length}
                  onChange={() => {}}
                />
                <span>Selecionar Todos</span>
              </div>
              <div className={styles.optionsDivider} />
            </>
          )}
          <div className={styles.optionsList}>
            {options.map(option => (
              <div 
                key={option.value}
                className={`${styles.filterOption} ${selected.includes(option.value) ? styles.selected : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {multiple && (
                  <input 
                    type="checkbox" 
                    checked={selected.includes(option.value)}
                    onChange={() => {}}
                  />
                )}
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [hasExpenses, setHasExpenses] = useState(false);
  const [hasIncome, setHasIncome] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(null);
  const [showPeriodOptions, setShowPeriodOptions] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState({});
  const [chartRefs] = useState({
    balanceTrend: React.createRef(),
    expensesByCategory: React.createRef(),
    budget: React.createRef(),
    'expenses-trend': React.createRef(),
    'income-trend': React.createRef()
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);
  const [openFilter, setOpenFilter] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()]
  });
  // Estado para armazenar as transações processadas
  const [transactions, setTransactions] = useState([]);
  
  // Estados para transações de todos os períodos (não afetados pelos filtros)
  const [allExpenses, setAllExpenses] = useState([]);
  const [allIncomes, setAllIncomes] = useState([]);
  
  // Estados para Timeline
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupByDate, setGroupByDate] = useState(true);
  
  // Estados para Categories
  const [categoryData, setCategoryData] = useState([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [incomeError, setIncomeError] = useState(null);

  // Lista de categorias para o filtro
  const categories = [
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'moradia', label: 'Moradia' },
    { value: 'saude', label: 'Saúde' },
    { value: 'educacao', label: 'Educação' },
    { value: 'lazer', label: 'Lazer' },
    { value: 'vestuario', label: 'Vestuário' },
    { value: 'outros', label: 'Outros' }
  ];

  // Lista de bancos para o filtro
  const banks = [
    { value: 'itau', label: 'Itaú' },
    { value: 'bradesco', label: 'Bradesco' },
    { value: 'santander', label: 'Santander' },
    { value: 'caixa', label: 'Caixa Econômica' },
    { value: 'bb', label: 'Banco do Brasil' },
    { value: 'nubank', label: 'Nubank' },
    { value: 'inter', label: 'Inter' },
    { value: 'outros', label: 'Outros' }
  ];

  const handlePeriodChange = (period) => {
    if (period === 'custom') {
      // Para data personalizada, apenas abrir o seletor de data
      // sem alterar o selectedPeriod ainda
      setShowPeriodOptions(false);
      setShowDateRangePicker(true);
    } else {
      // Para os outros períodos (mês atual, ano atual, etc.), 
      // aplica o filtro imediatamente
      setSelectedPeriod(period);
      setShowPeriodOptions(false);
      setShowDateRangePicker(false);
      setCustomDateRange(null);
      console.log('Período selecionado:', period);
    }
  };

  // Função para criar uma data com horário fixo do início do dia (00:00)
  const createDateWithStartOfDay = (dateString) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Função para criar uma data com horário fixo do fim do dia (23:59)
  const createDateWithEndOfDay = (dateString) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  };

  const handleDateRangeSelect = (dateRange) => {
    // Só aplicar o filtro quando o usuário clicar em "Aplicar"
    const startDate = createDateWithStartOfDay(dateRange.start);
    const endDate = createDateWithEndOfDay(dateRange.end);
    
    setCustomDateRange({
      start: dateRange.start,
      end: dateRange.end,
      // Armazenar as datas com horários fixos para início e fim do dia
      startNormalized: startDate.toISOString(),
      endNormalized: endDate.toISOString()
    });
    
    setSelectedPeriod('custom'); // Somente aqui definimos que é customizado
    setShowDateRangePicker(false);
    console.log('Período personalizado selecionado:', {
      start: dateRange.start,
      end: dateRange.end,
      startNormalized: startDate.toISOString(),
      endNormalized: endDate.toISOString()
    });
  };
  
  const handleDateRangeCancel = () => {
    // Se cancelar, não fazer nada, apenas fechar o seletor
    setShowDateRangePicker(false);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategories(value);
    // Quando mudar a categoria, aciona o fetchData novamente
    console.log('Categorias selecionadas:', value);
  };

  const handleBankChange = (value) => {
    setSelectedBanks(value);
    // Quando mudar o banco, aciona o fetchData novamente
    console.log('Bancos selecionados:', value);
  };

  // Lista de anos para o filtro
  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // Lista de meses para o filtro
  const months = [
    { value: 1, label: 'Janeiro', shortLabel: 'Jan' },
    { value: 2, label: 'Fevereiro', shortLabel: 'Fev' },
    { value: 3, label: 'Março', shortLabel: 'Mar' },
    { value: 4, label: 'Abril', shortLabel: 'Abr' },
    { value: 5, label: 'Maio', shortLabel: 'Mai' },
    { value: 6, label: 'Junho', shortLabel: 'Jun' },
    { value: 7, label: 'Julho', shortLabel: 'Jul' },
    { value: 8, label: 'Agosto', shortLabel: 'Ago' },
    { value: 9, label: 'Setembro', shortLabel: 'Set' },
    { value: 10, label: 'Outubro', shortLabel: 'Out' },
    { value: 11, label: 'Novembro', shortLabel: 'Nov' },
    { value: 12, label: 'Dezembro', shortLabel: 'Dez' }
  ];

  // Improved color palette with better contrasting colors
  const COLORS = [
    '#00C49F', // Teal
    '#FF6B6B', // Coral red
    '#2196F3', // Bright blue
    '#FFBB28', // Gold
    '#9C27B0', // Purple
    '#FF9800', // Orange
    '#4CAF50', // Green
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#607D8B', // Blue gray
    '#8BC34A', // Light green
    '#009688', // Teal
    '#FFC107', // Amber
    '#03A9F4', // Light blue
    '#673AB7', // Deep purple
  ];

  // Utility function to detect mobile view
  const isMobileView = () => {
    return window.innerWidth <= 768;
  };

  // Use a hook to track window size changes
  const [isMobile, setIsMobile] = useState(isMobileView());
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileView());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Shared function for customizing label rendering based on device
  const getCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    // Removi a verificação de dispositivos móveis para sempre mostrar as porcentagens
    if (percent < 0.05) return null; // Apenas não mostrar para fatias muito pequenas
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#000000" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontWeight="bold"
        fontSize={isMobile ? "10px" : "12px"}
        strokeWidth="0.5px"
        stroke="#ffffff"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      const newHeights = {};
      for (let entry of entries) {
        const chartId = entry.target.dataset.chartId;
        const { height } = entry.contentRect;
        newHeights[chartId] = height;
      }
      
    });

    Object.entries(chartRefs).forEach(([chartId, ref]) => {
      if (ref.current) {
        ref.current.dataset.chartId = chartId;
        resizeObserver.observe(ref.current);
      }
    });

    return () => {
      Object.values(chartRefs).forEach(ref => {
        if (ref.current) {
          resizeObserver.unobserve(ref.current);
        }
      });
    };
  }, []);

  // Effect para carregar os dados do dashboard quando o componente monta
  // ou quando os filtros mudam
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Buscando dados do dashboard...");
        setLoading(true);
        
        // Construir os parâmetros de consulta com base no período selecionado
        let queryParams = '';
        
        if (selectedPeriod === 'current' || selectedPeriod === 'month') {
          // Mês atual
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          queryParams = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        } else if (selectedPeriod === 'year') {
          // Ano atual
          const now = new Date();
          const startDate = new Date(now.getFullYear(), 0, 1);
          const endDate = new Date(now.getFullYear(), 11, 31);
          queryParams = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        } else if (selectedPeriod === 'last') {
          // Mês anterior
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          queryParams = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        } else if (selectedPeriod === 'custom' && customDateRange) {
          // Período personalizado
          queryParams = `?startDate=${customDateRange.startNormalized || customDateRange.start}&endDate=${customDateRange.endNormalized || customDateRange.end}`;
        }
          
        // Adicionar filtros para categorias e bancos se selecionados
          if (selectedCategories.length > 0) {
          queryParams += `&categories=${selectedCategories.join(',')}`;
          }
          
          if (selectedBanks.length > 0) {
          queryParams += `&banks=${selectedBanks.join(',')}`;
          }

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_PREFIX}/dashboard${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            },
            credentials: 'include'
          }
        );
          
          if (!response.ok) {
          throw new Error(`Falha ao carregar dados (${response.status})`);
        }

        const result = await response.json();
        console.log("Dados do dashboard carregados com sucesso:", result);
        setData(result);
        
        if (result.expenses && result.expenses.length > 0) {
          setHasExpenses(true);
        }
        
        if (result.incomes && result.incomes.length > 0) {
          setHasIncome(true);
        }
    } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
        setError(err.message || "Falha ao carregar os dados do dashboard. Por favor, tente novamente.");
    }
  };

    const fetchAllTransactions = async () => {
      try {
        console.log("Buscando todas as transações...");
        
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_PREFIX}/dashboard/all-transactions`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            },
            credentials: 'include'
          }
        );
          
          if (!response.ok) {
          throw new Error(`Falha ao carregar transações (${response.status})`);
        }

        const result = await response.json();
        console.log("Todas as transações carregadas com sucesso:", result);
        
        // Processar despesas
        if (result.expenses && Array.isArray(result.expenses)) {
          const processedExpenses = result.expenses.map(expense => ({
            id: expense.id,
            description: expense.description || 'Sem descrição',
            amount: parseFloat(expense.amount),
            date: new Date(expense.expense_date),
            category: expense.Category ? expense.Category.name : 'Sem categoria',
            categoryId: expense.category_id,
            bank: expense.bank ? expense.bank.name : 'Sem banco',
            type: 'expense',
            is_recurring: expense.recurrence !== null,
            payment_method: expense.payment_method || 'Não especificado'
          }));
          
          setAllExpenses(processedExpenses);
        }
        
        // Processar receitas
        if (result.incomes && Array.isArray(result.incomes)) {
          const processedIncomes = result.incomes.map(income => ({
            id: income.id,
            description: income.description || 'Sem descrição',
            amount: parseFloat(income.amount),
            date: new Date(income.date),
            category: income.Category ? income.Category.name : 'Sem categoria',
            categoryId: income.category_id,
            bank: income.bank ? income.bank.name : 'Sem banco',
            type: 'income',
            is_recurring: false
          }));
          
          setAllIncomes(processedIncomes);
        }
        
        // Combinar todas as transações para a timeline
        const allTransactions = [
          ...(result.expenses || []).map(expense => ({
            id: `expense-${expense.id}`,
            description: expense.description || 'Sem descrição',
            amount: parseFloat(expense.amount),
            date: new Date(expense.expense_date),
            category: expense.Category ? expense.Category.name : 'Sem categoria',
            bank: expense.bank ? expense.bank.name : 'Sem banco',
            type: 'expense',
            is_recurring: expense.recurrence !== null,
            payment_method: expense.payment_method || 'Não especificado'
          })),
          ...(result.incomes || []).map(income => ({
            id: `income-${income.id}`,
            description: income.description || 'Sem descrição',
            amount: parseFloat(income.amount),
            date: new Date(income.date),
            category: income.Category ? income.Category.name : 'Sem categoria',
            bank: income.bank ? income.bank.name : 'Sem banco',
            type: 'income',
            is_recurring: false
          }))
        ];
        
        // Ordenar por data (mais recente primeiro)
        allTransactions.sort((a, b) => b.date - a.date);
        
        setTransactions(allTransactions);
      } catch (err) {
        console.error("Erro ao buscar transações:", err);
        setError(err.message || "Falha ao carregar as transações. Por favor, tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    
    // Execute as duas chamadas quando o componente montar ou os filtros mudarem
    Promise.all([fetchData(), fetchAllTransactions()])
      .catch(err => {
        console.error("Erro ao carregar dados:", err);
        setError("Falha ao carregar os dados. Por favor, tente novamente.");
        setLoading(false);
      });
  }, [auth.token, selectedPeriod, selectedCategories, selectedBanks, customDateRange]);

  const handleFilterChange = (type, value) => {
    if (value === 'all') {
      // Se "Todos" foi selecionado
      setFilters(prev => ({
        ...prev,
        [type]: prev[type].length === (type === 'months' ? months.length : years.length)
          ? [] // Se todos já estavam selecionados, desmarca todos
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p>{`Data: ${formatDate(label)}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleChartExpand = (chartId) => {
    setExpandedCharts(prevCharts => ({ ...prevCharts, [chartId]: !prevCharts[chartId] }));
  };

  const renderChart = (chartId, title, chartComponent) => {
    return (
      <div
        className={`${styles.chartContainer} ${chartId === 'bank-trend' ? styles.trendChart : ''}`}
      >
        <div className={styles.chartHeader}>
          <h3>{title}</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div ref={chartRefs[chartId]} className={styles.chartWrapper} style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartComponent}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const handleFilterClick = (filterType) => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation(); // Impede que o clique no checkbox feche o dropdown
  };

  const formatSelectedMonths = () => {
    if (filters.months.length === 0) return 'Selecione os meses';
    if (filters.months.length === months.length) return 'Todos os meses';
    return filters.months
      .map(m => months.find(month => month.value === m)?.label)
      .join(', ');
  };

  const formatSelectedYears = () => {
    if (filters.years.length === 0) return 'Selecione os anos';
    if (filters.years.length === years.length) return 'Todos os anos';
    return filters.years.join(', ');
  };

  const formatPeriod = () => {
    const selectedMonths = filters.months.map(m => months.find(month => month.value === m)?.label).join(', ');
    const selectedYears = filters.years.join(', ');

    if (filters.months.length === 0 && filters.years.length === 0) {
      return 'Nenhum período selecionado';
    } else if (filters.months.length === 0) {
      return `Anos: ${selectedYears}`;
    } else if (filters.years.length === 0) {
      return `Meses: ${selectedMonths}`;
    } else {
      return `${selectedMonths} de ${selectedYears}`;
    }
  };

  // Função para formatar o filtro de data atual de maneira elegante
  const formatCurrentDateFilter = () => {
    // Para período selecionado específico
    if (selectedPeriod === 'current' || selectedPeriod === 'month') {
      const now = new Date();
      const monthName = months.find(m => m.value === now.getMonth() + 1)?.label;
      return `${monthName} de ${now.getFullYear()}`;
    } 
    else if (selectedPeriod === 'year') {
      const now = new Date();
      return `Ano de ${now.getFullYear()}`;
    } 
    else if (selectedPeriod === 'last') {
      const now = new Date();
      let previousMonth = now.getMonth(); // 0-based
      let year = now.getFullYear();
      
      if (previousMonth === 0) {
        previousMonth = 12;
        year = year - 1;
      }
      
      const monthName = months.find(m => m.value === previousMonth)?.label;
      return `${monthName} de ${year}`;
    } 
    else if (selectedPeriod === 'next') {
      const now = new Date();
      let nextMonth = now.getMonth() + 2; // +1 for 1-based, +1 for next month
      let year = now.getFullYear();
      
      if (nextMonth > 12) {
        nextMonth = 1;
        year = year + 1;
      }
      
      const monthName = months.find(m => m.value === nextMonth)?.label;
      return `${monthName} de ${year}`;
    } 
    else if (selectedPeriod === 'custom' && customDateRange) {
      // Formatar datas do período personalizado
      const startDate = new Date(customDateRange.start);
      const endDate = new Date(customDateRange.end);
      
      const formatCustomDate = (date) => {
        const day = date.getDate();
        const monthName = months.find(m => m.value === date.getMonth() + 1)?.shortLabel || 
                          months.find(m => m.value === date.getMonth() + 1)?.label.substring(0, 3);
        return `${day}/${monthName}/${date.getFullYear()}`;
      };
      
      return `${formatCustomDate(startDate)} até ${formatCustomDate(endDate)}`;
    } 
    else {
      // Usar os filtros manuais
      return formatPeriod();
    }
  };

  const renderFinancialGoalChart = () => {
    if (!data?.financial_goal) {
      return (
        <div className={`${styles.chartContainer} ${styles.emptyGoalCard}`}>
          <h3>Objetivo Financeiro</h3>
          <div className={styles.emptyGoalContent}>
            <span className={styles.emptyGoalIcon}>🎯</span>
            <p>Você ainda não definiu um objetivo financeiro.</p>
            <button 
              className={styles.createGoalButton}
              onClick={() => navigate('/profile')}
            >
              Definir Objetivo
            </button>
          </div>
        </div>
      );
    }

    const goal = data.financial_goal;
    const chartData = [{
      name: 'Progresso',
      economia: goal.total_saved > goal.amount ? goal.amount : goal.total_saved,
      projecao: goal.projected_savings > goal.amount ? goal.amount - goal.total_saved : goal.projected_savings - goal.total_saved,
      faltante: goal.projected_savings > goal.amount ? 0 : goal.amount - goal.projected_savings
    }];
    
    // Calculate the percentage saved
    const percentageSaved = (goal.total_saved / goal.amount * 100).toFixed(1);
    
    // Calculate the time remaining in a more readable format
    const formatTimeRemaining = (months) => {
      if (months <= 0) return "Meta alcançada!";
      if (months === 1) return "1 mês restante";
      if (months < 12) return `${months} meses restantes`;
      
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      if (remainingMonths === 0) {
        return years === 1 ? "1 ano restante" : `${years} anos restantes`;
      } else {
        return years === 1 
          ? `1 ano e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'} restantes`
          : `${years} anos e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'} restantes`;
      }
    };
    
    const timeRemaining = formatTimeRemaining(goal.months_remaining);
    
    // Calculate the savings pace
    const calculateSavingsPace = () => {
      if (goal.monthly_balance >= goal.monthly_needed) {
        return {
          status: "good",
          message: "Você está economizando acima do necessário. Continue assim!",
          icon: "🚀",
          color: "var(--success-color)"
        };
      } else if (goal.monthly_balance > 0) {
        const percentOfNeeded = (goal.monthly_balance / goal.monthly_needed * 100).toFixed(0);
        return {
          status: "warning",
          message: `Você está economizando apenas ${percentOfNeeded}% do necessário para atingir seu objetivo no prazo.`,
          icon: "⚠️",
          color: "#FFC107" // amber
        };
      } else {
        return {
          status: "bad",
          message: "Você não está conseguindo economizar. Revise seu orçamento.",
          icon: "❌",
          color: "var(--error-color)"
        };
      }
    };
    
    const savingsPace = calculateSavingsPace();
    
    // Calcular a previsão de conclusão
    const completionDate = new Date();
    if (goal.months_needed_with_current_savings && goal.months_needed_with_current_savings !== Infinity) {
      completionDate.setMonth(completionDate.getMonth() + goal.months_needed_with_current_savings);
    } else {
      completionDate.setMonth(completionDate.getMonth() + 60); // Placeholder para "mais de 5 anos"
    }
    
    // Formatar a data de conclusão
    const formattedCompletionDate = goal.monthly_balance <= 0 
      ? "Incalculável com economia zero ou negativa" 
      : goal.months_needed_with_current_savings === Infinity
        ? "Incalculável com economia insuficiente"
        : new Date(completionDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
      <div className={`${styles.chartContainer} ${styles.goalCard}`}>
        <div className={styles.goalCardHeader}>
          <div className={styles.goalCardTitle}>
            <h3>Objetivo: {goal.name}</h3>
            <div className={styles.targetDate}>
              <span>Meta para:</span> {new Date(goal.end_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className={styles.goalTargetAmount}>
            <div className={styles.targetAmountLabel}>Meta Total</div>
            <div className={styles.targetAmountValue}>{formatCurrency(goal.amount)}</div>
          </div>
        </div>
        
        <div className={styles.goalProgressSection}>
          <div className={styles.progressCircleContainer}>
            <div 
              className={styles.progressCircle}
              style={{
                background: `conic-gradient(
                  ${savingsPace.color} ${percentageSaved * 3.6}deg, 
                  var(--background-color) ${percentageSaved * 3.6}deg
                )`
              }}
            >
              <div className={styles.progressInner}>
                <div className={styles.progressPercentage}>{percentageSaved}%</div>
                <div className={styles.progressLabel}>concluído</div>
              </div>
            </div>
            <div className={styles.timeRemainingBadge}>
              <div className={styles.timeIcon}>⏱️</div>
              <div className={styles.timeText}>{timeRemaining}</div>
            </div>
          </div>
          
          <div className={styles.goalStatsContainer}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <span className={styles.statIcon}>💰</span> Economizado
              </div>
              <div className={`${styles.statValue} ${styles.savedValue}`}>{formatCurrency(goal.total_saved)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <span className={styles.statIcon}>📊</span> Faltando
              </div>
              <div className={styles.statValue}>{formatCurrency(goal.amount - goal.total_saved)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <span className={styles.statIcon}>💸</span> Economia Mensal
              </div>
              <div className={`${styles.statValue} ${goal.monthly_balance >= goal.monthly_needed ? styles.positiveValue : styles.negativeValue}`}>
                {formatCurrency(goal.monthly_balance)}
              </div>
              <div className={styles.statSource}>
                {Math.abs(goal.current_month_balance) > 0 ? "mês atual" : "média histórica"}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                <span className={styles.statIcon}>🎯</span> Necessário/Mês
              </div>
              <div className={styles.statValue}>{formatCurrency(goal.monthly_needed)}</div>
            </div>
          </div>
        </div>
        
        <div className={`${styles.savingsPaceIndicator} ${styles[`pace-${savingsPace.status}`]}`}>
          <div className={styles.paceIcon}>{savingsPace.icon}</div>
          <div className={styles.paceMessage}>{savingsPace.message}</div>
        </div>
        
        <div className={styles.projectionSection}>
          <div className={styles.projectionHeader}>
            <h4>Projeção de Conclusão</h4>
            <div className={styles.projectionTimeline}>
              <div className={styles.timelineStart}>
                <div className={styles.timelinePoint}></div>
                <div className={styles.timelineDate}>Hoje</div>
              </div>
              <div className={styles.timelineBar}>
                <div 
                  className={`${styles.timelineProgress} ${!goal.is_achievable ? styles.timelineWarning : ''}`}
                  style={{ width: `${Math.min((goal.months_remaining / goal.months_needed_with_current_savings) * 100, 100)}%` }}
                ></div>
              </div>
              <div className={styles.timelineEnd}>
                <div className={styles.timelinePoint}></div>
                <div className={styles.timelineDate}>
                  {formattedCompletionDate}
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.projectionData}>
            <div className={styles.chartContainer}>
              <BarChart
                data={chartData}
                height={120}
                barSize={20}
                barGap={8}
                barCategoryGap={35}
                maxBarSize={50}
              />
            </div>
            
            <div className={styles.projectionLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: 'var(--success-color)' }}></div>
                <div className={styles.legendLabel}>Economizado</div>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#2196F3' }}></div>
                <div className={styles.legendLabel}>Projeção Futura</div>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: 'var(--error-color)' }}></div>
                <div className={styles.legendLabel}>Faltante</div>
              </div>
            </div>
          </div>
        </div>
        
        {!goal.is_achievable && (
          <div className={styles.alertMessage}>
            <div className={styles.alertTitle}>
              <span>⚠️</span> Objetivo em risco
            </div>
            <div className={styles.alertContent}>
              Com seu ritmo atual de economia, esta meta não será atingida no prazo estabelecido. 
              Considere aumentar o valor mensal economizado ou ajustar a data de conclusão da meta.
            </div>
            <div className={styles.alertActions}>
              <button className={styles.actionButton} onClick={() => navigate('/expenses')}>
                <span>📊</span> Revisar Despesas
              </button>
              <button className={styles.actionButton} onClick={() => navigate('/profile')}>
                <span>⚙️</span> Ajustar Meta
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBudgetChart = () => {
    // Verificar se existem dados de orçamento
    if (!data?.budget_info) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💰</div>
          <p>Você ainda não tem um orçamento definido para este período.</p>
          <button 
            className={styles.createGoalButton}
            onClick={() => navigate('/settings')}
          >
            Definir Orçamento
          </button>
        </div>
      );
    }
    
    const { total_budget, total_spent } = data.budget_info;
    
    // Calcular informações adicionais
    const remainingBudget = Math.max(0, total_budget - total_spent);
    const spentPercentage = (total_spent / total_budget) * 100;
    const isOverBudget = total_spent > total_budget;
    
    // Calcular dias que faltam no mês atual
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = lastDayOfMonth - now.getDate();
    
    // Calcular o percentual ideal baseado em quantos dias do mês já passaram
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayPercentage = (currentDay / daysInMonth) * 100;
    const idealSpentPercentage = dayPercentage;
    
    // Determinar o status de orçamento
    const isBehindBudget = spentPercentage < idealSpentPercentage - 5; // Está gastando menos que o ideal
    const isAheadBudget = spentPercentage > idealSpentPercentage + 5 && spentPercentage < 90; // Está gastando mais que o ideal
    const isDangerZone = spentPercentage >= 90 && spentPercentage < 100; // Está em zona de perigo
    
    // Status e avisos
    let statusColor, advice, statusIcon;
    
    if (isOverBudget) {
      statusColor = 'dangerProgress';
      advice = 'Você ultrapassou seu orçamento! Evite novos despesas até o próximo mês.';
      statusIcon = '⚠️';
    } else if (isDangerZone) {
      statusColor = 'warningProgress';
      advice = 'Você está próximo do limite do orçamento. Reduza os despesas para não ultrapassar.';
      statusIcon = '⚠️';
    } else if (isAheadBudget) {
      statusColor = 'warningProgress';
      advice = `Seus despesas estão acima do ideal para o dia ${currentDay}. Diminua o ritmo para não ter problemas no fim do mês.`;
      statusIcon = '⚠️';
    } else if (isBehindBudget) {
      statusColor = 'successProgress';
      advice = 'Parabéns! Você está gastando menos do que o planejado. Continue assim!';
      statusIcon = '✅';
    } else {
      statusColor = 'normalProgress';
      advice = 'Seus despesas estão alinhados com seu orçamento. Continue monitorando.';
      statusIcon = '✅';
    }
    
    const formattedDate = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    return (
      <div className={styles.budgetInfoContainer}>
        <div className={styles.budgetHeader}>
          <h3>Resumo do Orçamento</h3>
          <div className={styles.budgetDate}>
            {formatCurrentDateFilter()}
          </div>
        </div>
        
        <div className={styles.budgetStatsContainer}>
          <div className={styles.budgetStats}>
            <div className={styles.budgetStat}>
              <span>Orçamento Total</span>
              <strong>{formatCurrency(total_budget)}</strong>
            </div>
            <div className={styles.budgetStat}>
              <span>Despesa até agora</span>
              <strong className={isOverBudget ? styles.overBudget : ''}>{formatCurrency(total_spent)}</strong>
            </div>
            <div className={styles.budgetStat}>
              <span>Disponível</span>
              <strong>{formatCurrency(remainingBudget)}</strong>
            </div>
          </div>
          
          <div className={styles.budgetProgressContainer}>
            <div className={styles.budgetProgressLabel}>
              <span>Progresso do orçamento</span>
              <span>{spentPercentage.toFixed(1)}%</span>
            </div>
            <div className={styles.budgetProgressBar}>
              <div 
                className={`${styles.budgetProgress} ${styles[statusColor]}`} 
                style={{ width: `${Math.min(spentPercentage, 100)}%` }}
              />
              <div 
                className={styles.idealMarker}
                style={{ left: `${idealSpentPercentage}%` }}
                title={`Ideal: ${idealSpentPercentage.toFixed(1)}%`}
              />
            </div>
          </div>
          
          <div className={styles.dailySpendingInfo}>
            <div className={styles.daysInfo}>
              <span>Dias restantes</span>
              <strong>{daysRemaining}</strong>
            </div>
            <div className={styles.dailyLimitInfo}>
              <span>Despesa diário ideal</span>
              <strong>{formatCurrency(remainingBudget / (daysRemaining || 1))}</strong>
            </div>
          </div>
        </div>
        
        <div className={`${styles.budgetAdvice} ${styles[statusColor]}`}>
          <div className={styles.adviceContent}>
            <span className={styles.adviceIcon}>{statusIcon}</span>
            <p>{advice}</p>
          </div>
        </div>
        
        <div className={styles.budgetActions}>
          <button 
            className={styles.budgetActionButton}
            onClick={() => navigate('/expenses')}
          >
            Ver Despesas
          </button>
        </div>
      </div>
    );
  };

  // Improved renderIncomeVsExpensesChart with mobile optimization
  const renderIncomeVsExpensesChart = () => {
    if (!data?.budget_info) return null;

    const available = Math.max(0, data.budget_info.total_budget - data.budget_info.total_spent);
    const totalSpent = data.budget_info.total_spent;
    const total = available + totalSpent;
    
    const chartData = [
                        {
                          name: 'Disponível',
        value: available,
        percent: available / total,
        color: 'var(--primary-color)'
                        },
                        {
                          name: 'Total Despesa',
        value: totalSpent,
        percent: totalSpent / total,
        color: 'var(--error-color)'
      }
    ];

    // Função personalizada para rótulos do gráfico Receitas vs Despesas
    const incomePieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      // Este é um gráfico especial de apenas 2 partes, podemos sempre mostrar os rótulos
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text 
          x={x} 
          y={y} 
          fill="#ffffff" 
          textAnchor="middle" 
          dominantBaseline="central"
          fontWeight="bold"
          fontSize={isMobile ? "12px" : "14px"}
          strokeWidth="0.5px"
          stroke="#000000"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Receitas vs Despesas</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div className={styles.incomeVsExpensesContainer}>
          <div className={styles.chartContainer}>
            <PieChart
              data={chartData}
              height={isMobile ? 220 : 280}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
            />
          </div>
          
          <div className={styles.incomeVsExpensesInfo}>
            <div className={styles.infoItem}>
              <span>Total de Receitas:</span>
              <strong className={styles.positive}>{formatCurrency(total)}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Total de Despesas:</span>
              <strong className={styles.negative}>{formatCurrency(totalSpent)}</strong>
            </div>
            <div className={styles.infoItem}>
              <span>Saldo disponível:</span>
              <strong className={styles.positive}>{formatCurrency(available)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Improved renderExpensesByCategoryChart with better visualization and mobile optimization
  const renderExpensesByCategoryChart = () => {
    if (!data || !data.expenses_by_category || data.expenses_by_category.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>Nenhuma despesa encontrada no período selecionado.</p>
        </div>
      );
    }

    // Detect if we're on mobile
    const isMobileView = window.innerWidth <= 768;

    // Limit the number of categories shown for mobile view
    const maxCategoriesToShow = isMobile ? 5 : data.expenses_by_category.length;
    
    // Sort categories by amount and take the top categories
    const sortedCategories = [...data.expenses_by_category].sort((a, b) => b.total - a.total);
    
    // Create "Outros" category if we're limiting the display
    let processedCategories = sortedCategories.slice(0, maxCategoriesToShow);
    let othersTotal = 0;
    
    if (isMobile && sortedCategories.length > maxCategoriesToShow) {
      othersTotal = sortedCategories.slice(maxCategoriesToShow).reduce((sum, cat) => sum + cat.total, 0);
      
      if (othersTotal > 0) {
        processedCategories.push({
          category_name: "Outros",
          total: othersTotal
        });
      }
    }

    // Format data for the chart
    const categoriesData = processedCategories.map((category, index) => ({
      id: index,
      name: category.category_name,
      value: category.total,
      color: category.category_name === "Outros" 
        ? "#999999" 
        : COLORS[index % COLORS.length],
      percent: 0 // Will be calculated below
    }));

    // Calcular total de despesas e percentages
    const totalExpenses = categoriesData.reduce((sum, cat) => sum + cat.value, 0);
    categoriesData.forEach(cat => {
      cat.percent = cat.value / totalExpenses;
    });

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Despesas por Categoria</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div className={styles.categoriesPieContainer}>
          <div className={styles.chartContainer}>
            <PieChart
              data={categoriesData}
              height={isMobile ? 220 : 350}
              innerRadius={40}
              outerRadius={100}
              paddingAngle={2}
            />
          </div>
          
          <div className={styles.categoriesInsights}>
            <h4>Categoria principal: {categoriesData[0]?.name || 'Nenhuma'}</h4>
            <p>
              Representa {categoriesData[0]?.percent ? (categoriesData[0].percent * 100).toFixed(1) : 0}% dos seus despesas.
            </p>
            <div className={styles.infoItem}>
              <span>Total de Despesas:</span>
              <strong>{formatCurrency(totalExpenses)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Rest of the component content */}
    </div>
  );
};

export default Dashboard;
