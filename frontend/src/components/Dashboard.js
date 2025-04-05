import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  AreaChart,
  ReferenceLine,
  LabelList,
} from 'recharts';
import styles from '../styles/dashboard.module.css';
import { FaCalendarAlt, FaChartLine, FaPlus, FaChevronDown, FaChevronRight, FaSearch, FaFilter } from 'react-icons/fa';
import DateRangePicker from './DateRangePicker';
import {  
  BsPencil,
  BsEye,
  // ... other imports
} from 'react-icons/bs';

const motivationalPhrases = [
  "Cuide do seu dinheiro hoje para não precisar se preocupar amanhã.",
  "Cada real economizado é um passo mais perto da sua liberdade financeira.",
  "Não trabalhe apenas por dinheiro, faça o dinheiro trabalhar para você.",
  "Investir é plantar hoje para colher no futuro.",
  "Quem controla seu dinheiro, controla seu futuro.",
  "Gaste menos do que ganha e invista a diferença.",
  "Disciplina financeira hoje significa tranquilidade amanhã.",
  "Pequenos despesas diários podem se tornar grandes perdas anuais.",
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
          `${process.env.REACT_APP_API_URL}/api/dashboard/bank-balance-trend?months=${projectionMonths}`,
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

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart 
          data={data.projectionData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--error-color)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--error-color)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#1E90FF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date);
              const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return `${months[d.getMonth()]}/${d.getFullYear()}`;
            }}
            stroke="var(--text-color)"
          />
          <YAxis
            tickFormatter={formatFullCurrency}
            stroke="var(--text-color)"
            tick={{ fill: 'var(--text-color)', fontSize: 11 }}
          />
          <Tooltip
            formatter={formatFullCurrency}
            labelFormatter={(date) => {
              const d = new Date(date);
              const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
              return `${months[d.getMonth()]} de ${d.getFullYear()}`;
            }}
            contentStyle={{
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px'
            }}
          />
          <Legend 
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              let color;
              switch(value) {
                case 'receitas':
                  color = 'var(--success-color)';
                  value = 'Receitas';
                  break;
                case 'despesas':
                  color = 'var(--error-color)';
                  value = 'Despesas';
                  break;
                case 'saldo':
                  color = '#1E90FF';
                  value = 'Saldo';
                  break;
                default:
                  color = 'var(--text-color)';
              }
              return <span style={{ color }}>{value}</span>;
            }}
          />
          
          <Area
            type="monotone"
            dataKey="receitas"
            stroke="var(--success-color)"
            fillOpacity={1}
            fill="url(#colorGanhos)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            stroke="var(--error-color)"
            fillOpacity={1}
            fill="url(#colorDespesas)"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#1E90FF"
            strokeWidth={3}
            dot={(props) => {
              const { cx, cy, index } = props;
              const isActive = activeDot === index;
              
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 6 : 4}
                  fill="#1E90FF"
                  stroke={isActive ? "#fff" : "none"}
            strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleDotClick(index)}
                  onMouseEnter={() => handleMouseEnter(props.payload, index)}
                />
              );
            }}
            activeDot={{ r: 8, fill: '#1E90FF', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

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

  // Cores para os gráficos
  const COLORS = [
    '#FF5252', // Red
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#FFEB3B', // Yellow
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#E91E63', // Pink
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#FFC107', // Amber
    '#8BC34A', // Light Green
    '#673AB7', // Deep Purple
    '#03A9F4', // Light Blue
    '#FF5722', // Deep Orange
    '#CDDC39', // Lime
  ];
  
  // Definição das funções fetchData e fetchAllTransactions fora do useEffect
  // para que possam ser acessadas de qualquer lugar no componente
  const fetchData = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Garantir que temos um token válido, mesmo após refresh da página
        // Tentar primeiro do contexto de autenticação
        let token = auth.token;
        
        // Se não tiver um token no contexto, tentar buscar do localStorage
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage...');
          token = localStorage.getItem('token');
          
          if (!token) {
            console.error('Nenhum token de autenticação encontrado');
            navigate('/login');
            return;
          } else {
            console.log('Token recuperado do localStorage');
          }
        }
        
        // Construir queryParams baseado nos filtros
        const queryParams = new URLSearchParams();
        
        // Adiciona período ao filtro
        let startDate, endDate;
        
        if (selectedPeriod === 'current') {
          // Mês atual
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          queryParams.append('startDate', startDate.toISOString().split('T')[0]);
          queryParams.append('endDate', endDate.toISOString().split('T')[0]);
        } else if (selectedPeriod === 'last') {
          // Mês anterior
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          queryParams.append('startDate', startDate.toISOString().split('T')[0]);
          queryParams.append('endDate', endDate.toISOString().split('T')[0]);
        } else if (selectedPeriod === 'next') {
          // Próximo mês
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          queryParams.append('startDate', startDate.toISOString().split('T')[0]);
          queryParams.append('endDate', endDate.toISOString().split('T')[0]);
        } else if (selectedPeriod === 'year') {
          // Ano atual
          const now = new Date();
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          queryParams.append('startDate', startDate.toISOString().split('T')[0]);
          queryParams.append('endDate', endDate.toISOString().split('T')[0]);
        } else if (selectedPeriod === 'custom' && customDateRange) {
          // Período personalizado
          startDate = createDateWithStartOfDay(customDateRange.start);
          endDate = createDateWithEndOfDay(customDateRange.end);
          queryParams.append('startDate', customDateRange.start);
          queryParams.append('endDate', customDateRange.end);
        }
        
        // Adiciona categorias ao filtro
        if (selectedCategories.length > 0) {
          selectedCategories.forEach(category => queryParams.append('categories[]', category));
        }
        
        // Adiciona bancos ao filtro
        if (selectedBanks.length > 0) {
          selectedBanks.forEach(bank => queryParams.append('banks[]', bank));
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard?${queryParams}`, {
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
          console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway ou URL incorreta.');
          console.log('URL da requisição:', `${process.env.REACT_APP_API_URL}/api/dashboard?${queryParams}`);
          console.log('Valor de REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível ou configuração incorreta. Por favor, verifique os logs e tente novamente.');
        }
        
        if (!response.ok) {
          // Get detailed error message if available
          let errorMessage = 'Erro ao carregar dados do dashboard';
          try {
            // Parsear o JSON manualmente já que usamos text() acima
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If can't parse error JSON, use status text
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        // Parsear o JSON manualmente já que usamos text() acima
        let jsonData;
        try {
          jsonData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        console.log("Dashboard API response:", jsonData);
        
        // Verificar se há despesas e receitas
        setHasExpenses(jsonData.expenses && jsonData.expenses.length > 0);
        setHasIncome(jsonData.incomes && jsonData.incomes.length > 0);
        
        setData(jsonData);

        // Processar transações
        const expensesData = jsonData.expenses ? jsonData.expenses.map(item => ({
          id: item.id || `expense-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.expense_date || item.date),
          description: item.description,
          amount: item.amount,
          type: 'expense',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          bank: item.Bank?.name || 'Sem banco',
          is_recurring: item.is_recurring,
          recurrence_id: item.recurrence_id
        })) : [];
        
        const incomesData = jsonData.incomes ? jsonData.incomes.map(item => ({
          id: item.id || `income-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.date),
          description: item.description,
          amount: item.amount,
          type: 'income',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          bank: item.Bank?.name || 'Sem banco',
          is_recurring: item.is_recurring,
          recurrence_id: item.recurrence_id
        })) : [];
        
        console.log("Total expenses found:", expensesData.length);
        console.log("Total incomes found:", incomesData.length);
        
        setTransactions([...expensesData, ...incomesData]);
        
        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        
        // If we haven't exceeded max retries and it's a server error (500)
        if (retryCount < maxRetries && (err.message.includes('500') || err.message.includes('502'))) {
          retryCount++;
          console.log(`Retrying dashboard fetch (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return attemptFetch();
        }
        
        setError(err.message);
        setLoading(false);
      }
    };
    
    try {
      await attemptFetch();
    } catch (err) {
      console.error("Unhandled error in fetchData:", err);
      setError("Erro inesperado ao buscar dados. Por favor, tente novamente.");
      setLoading(false);
    }
  };
  
  const fetchAllTransactions = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      try {
        // Garantir que temos um token válido, mesmo após refresh da página
        let token = auth.token;
        
        // Se não tiver um token no contexto, tentar buscar do localStorage
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage para fetchAllTransactions...');
          token = localStorage.getItem('token');
          
          if (!token) {
            console.error('Nenhum token de autenticação encontrado para fetchAllTransactions');
            return;
          } else {
            console.log('Token recuperado do localStorage para fetchAllTransactions');
          }
        }
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard/all-transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Verificar se a resposta parece ser HTML (possível página de erro 502)
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
        if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta de all-transactions contém HTML. Possível erro 502 Bad Gateway.');
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        if (!response.ok) {
          // Get detailed error message if available
          let errorMessage = 'Erro ao carregar todas as transações';
          try {
            // Parsear o JSON manualmente já que usamos text() acima
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // If can't parse error JSON, use status text
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        // Parsear o JSON manualmente já que usamos text() acima
        let jsonData;
        try {
          jsonData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        // Processar transações de despesas
        const expensesData = jsonData.expenses ? jsonData.expenses.map(item => ({
          id: item.id || `expense-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.expense_date || item.date),
          description: item.description,
          amount: item.amount,
          type: 'expense',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          bank: item.Bank?.name || 'Sem banco'
        })) : [];
        
        // Processar transações de receitas
        const incomesData = jsonData.incomes ? jsonData.incomes.map(item => ({
          id: item.id || `income-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.date),
          description: item.description,
          amount: item.amount,
          type: 'income',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          bank: item.Bank?.name || 'Sem banco'
        })) : [];
        
        console.log("Total de despesas encontradas:", expensesData.length);
        console.log("Total de receitas encontradas:", incomesData.length);
        
        setAllExpenses(expensesData);
        setAllIncomes(incomesData);
        setHasExpenses(expensesData.length > 0);
        setHasIncome(incomesData.length > 0);
        
      } catch (err) {
        console.error('Erro ao buscar todas as transações:', err);
        
        // If we haven't exceeded max retries and it's a server error (500)
        if (retryCount < maxRetries && (err.message.includes('500') || err.message.includes('502'))) {
          retryCount++;
          console.log(`Retrying all transactions fetch (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return attemptFetch();
        }
        
        // If all retries failed, set empty data but don't show error to user
        // since this is supplementary data
        setAllExpenses([]);
        setAllIncomes([]);
        setHasExpenses(false);
        setHasIncome(false);
      }
    };
    
    try {
      await attemptFetch();
    } catch (err) {
      console.error("Unhandled error in fetchAllTransactions:", err);
      // Não mostramos esse erro ao usuário, apenas preenchemos com dados vazios
      setAllExpenses([]);
      setAllIncomes([]);
    }
  };
  
  // useEffect para carregar dados iniciais - com lógica mais robusta
  useEffect(() => {
    // Tentamos carregar independentemente do auth.token
    // dentro da função fetchData já verificamos o token tanto do contexto quanto do localStorage
    fetchData();
    
    // Esta função será chamada quando qualquer um dos valores de dependência mudar
  }, [selectedPeriod, selectedCategories, selectedBanks, customDateRange]);
  
  // Efeito para buscar todas as transações (não filtradas)
  useEffect(() => {
    // Tentamos sempre carregar dados ao montar o componente
    fetchAllTransactions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll(`.${styles.modernSelect}`);
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
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={chartData}
                layout="vertical"
                barSize={20}
                margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency} 
                  tick={{ fill: 'var(--text-color)', fontSize: 10 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  hide={true}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), '']}
                  contentStyle={{
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <Bar dataKey="economia" stackId="a" fill="var(--success-color)" name="Economizado" />
                <Bar dataKey="projecao" stackId="a" fill="#2196F3" name="Projeção Futura" />
                <Bar dataKey="faltante" stackId="a" fill="var(--error-color)" name="Faltante" />
              </BarChart>
            </ResponsiveContainer>
            
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

  // Ajustar renderIncomeVsExpensesChart para melhorar margens e posicionamento da legenda
  const renderIncomeVsExpensesChart = () => {
    if (!data?.budget_info) return null;

    return renderChart('income-vs-expenses', 'Receitas vs Despesas',
                  <PieChart margin={{ top: 20, right: 40, left: 30, bottom: 30 }}>
                    <Pie
                      data={[
                        {
                          name: 'Disponível',
                          value: Math.max(0, data.budget_info.total_budget - data.budget_info.total_spent)
                        },
                        {
                          name: 'Total Despesa',
                          value: data.budget_info.total_spent
                        }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      label={({ name, percent }) =>
                        name && percent ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                    >
                      <Cell fill="var(--primary-color)" />
                      <Cell fill="var(--error-color)" />
                    </Pie>
                    <Tooltip
                      formatter={formatCurrency}
                      contentStyle={{
                        backgroundColor: 'var(--card-background)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-color)',
                        padding: '10px',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
                      itemStyle={{ color: 'var(--text-color)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>}
                      verticalAlign="bottom"
                      align="center"
                      height={36}
                    />
                  </PieChart>
    );
  };

  const renderExpensesByCategoryChart = () => {
    if (!data || !data.expenses_by_category || data.expenses_by_category.length === 0) {
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
          <div className={styles.emptyChartContent}>
            <span className={styles.emptyChartIcon}>📊</span>
            <p>Não há despesas no período selecionado.</p>
          </div>
        </div>
      );
    }

    const categoriesData = data.expenses_by_category.map((category, index) => ({
      id: index,
      name: category.category_name,
      value: category.total,
      color: COLORS[index % COLORS.length]
    }));

    // Calcular total de despesas
    const totalExpenses = categoriesData.reduce((sum, cat) => sum + cat.value, 0);

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
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <Pie
                data={categoriesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, percent}) => name && percent ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
              >
                {categoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.categoriesInsights}>
          <h4>Categoria principal: {categoriesData[0]?.name || 'Nenhuma'}</h4>
          <p>
            Representa {categoriesData[0]?.value ? ((categoriesData[0].value / totalExpenses) * 100).toFixed(1) : 0}% dos seus despesas.
          </p>
          <div className={styles.infoItem}>
            <span>Total de Despesas:</span>
            <strong>{formatCurrency(totalExpenses)}</strong>
          </div>
        </div>
      </div>
    );
  };

  const renderTimelineChart = () => {
    // Use o activeSection de escopo superior
    
    if (!data) return null;

    // Verificar se temos transações
    if (!allExpenses.length && !allIncomes.length) {
      return (
        <div className={styles.timelineContainer}>
          <div className={styles.timelineHeader}>
            <h3>Linha do Tempo de Transações</h3>
          </div>
          <div className={styles.emptyTimeline}>
            <div className={styles.emptyIcon}>💰</div>
            <p>Ainda não existem transações registradas.</p>
            <div className={styles.emptyStateButtons}>
              <button 
                className={styles.addExpenseButton}
                onClick={() => navigate('/expenses/add')}
              >
                Adicionar Despesa
              </button>
              <button 
                className={styles.addIncomeButton}
                onClick={() => navigate('/incomes/add')}
              >
                Adicionar Receita
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Combinar todas as transações (não filtradas por período)
    const allTransactions = [...allExpenses, ...allIncomes];

    // Aplicar o filtro global de período, se existir
    let timelineFilteredTransactions = [...allTransactions];
    
    if (selectedPeriod) {
      let startDate, endDate;
      
      if (selectedPeriod === 'month' || selectedPeriod === 'current') {
        // Mês atual
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'year') {
        // Ano atual
        const now = new Date();
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'last') {
        // Mês anterior
        const now = new Date();
        let month = now.getMonth() - 1;
        let year = now.getFullYear();
        
        if (month < 0) {
          month = 11;
          year--;
        }
        
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'next') {
        // Próximo mês
        const now = new Date();
        let month = now.getMonth() + 1; // Próximo mês (0-based)
        let year = now.getFullYear();
        
        // Se for Dezembro, o próximo mês será Janeiro do próximo ano
        if (month > 11) {
          month = 0;
          year++;
        }
        
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        console.log(`Período próximo mês (timeline): ${formatDate(startDate)} - ${formatDate(endDate)}`);
      } else if (selectedPeriod === 'custom' && customDateRange) {
        // Período personalizado - com melhor tratamento de timezone
        if (customDateRange.startNormalized) {
          startDate = new Date(customDateRange.startNormalized);
          endDate = new Date(customDateRange.endNormalized);
        } else {
          // Compatibilidade com dados antigos - fixar o horário para 12:00
          const [startYear, startMonth, startDay] = customDateRange.start.split('-').map(num => parseInt(num, 10));
          const [endYear, endMonth, endDay] = customDateRange.end.split('-').map(num => parseInt(num, 10));
          
          startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        }
        
        console.log(`Período personalizado (timeline): ${formatDate(startDate)} - ${formatDate(endDate)}`);
      }
      
      // Se temos um período definido, filtramos as transações
      if (startDate && endDate) {
        console.log(`Aplicando filtro global de período: ${formatDate(startDate)} - ${formatDate(endDate)}`);
        
        // Garantir que o horário de endDate seja 23:59:59 para incluir todo o dia final
        const endOfDayDate = new Date(endDate);
        endOfDayDate.setHours(23, 59, 59, 999);
        
        timelineFilteredTransactions = allTransactions.filter(item => {
          // Normalizar a data do item para evitar problemas de timezone
          const itemDate = new Date(item.date);
          
          // Resetar horas/minutos/segundos da data do item para comparação por dia
          const itemDateStart = new Date(itemDate);
          itemDateStart.setHours(0, 0, 0, 0);
          
          const itemDateEnd = new Date(itemDate);
          itemDateEnd.setHours(23, 59, 59, 999);
          
          // Verificar se a data está dentro do intervalo
          // Uma transação está no intervalo se:
          // 1. O dia do item é >= ao dia inicial E
          // 2. O dia do item é <= ao dia final
          return itemDateStart >= startDate && itemDateStart <= endOfDayDate;
        });
        
        console.log(`Transações filtradas por período: ${timelineFilteredTransactions.length}`);
      }
    }

    // Aplicar filtros específicos da timeline
    const filteredData = timelineFilteredTransactions.filter(item => {
      // Type filter
      if (timelineFilter !== 'all' && item.type !== timelineFilter) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.description.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.bank.toLowerCase().includes(searchLower) ||
          formatCurrency(item.amount).includes(searchLower)
        );
      }
      
      return true;
    });

    console.log(`Timeline: Filtrado ${filteredData.length} de ${allTransactions.length} transações`);
    console.log(`Usando filtro global: ${selectedPeriod}`);

    // Sort by date, most recent first
    filteredData.sort((a, b) => b.date - a.date);

    // Group by date if enabled
    const groupedData = groupByDate 
      ? filteredData.reduce((groups, item) => {
          const dateKey = item.date.toISOString().split('T')[0];
          
          if (!groups[dateKey]) {
            groups[dateKey] = {
              date: item.date,
              items: []
            };
          }
          
          groups[dateKey].items.push(item);
          return groups;
        }, {})
      : null;
    
    const groupedArray = groupByDate 
      ? Object.values(groupedData).sort((a, b) => b.date - a.date) 
      : null;

    const toggleExpand = (id) => {
      setExpandedItems(prev => 
        prev.includes(id) 
          ? prev.filter(item => item !== id) 
          : [...prev, id]
      );
    };
    
    const hasDailyTotal = (items) => {
      return items.length > 1;
    };
    
    const calculateDailyTotal = (items) => {
      const income = items
        .filter(item => item.type === 'income')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
        
      const expense = items
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
        
      return {
        income,
        expense,
        balance: income - expense
      };
    };
    
    const getRelativeDate = (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      
      if (dateObj.getTime() === today.getTime()) {
        return 'Hoje';
      } else if (dateObj.getTime() === yesterday.getTime()) {
        return 'Ontem';
      } else {
        const diffTime = today - dateObj;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Se a data for futura ou muito antiga, mostre apenas a data formatada
        if (diffDays < 0 || diffDays > 60) {
          return formatDate(date);
        } else if (diffDays < 7) {
          return `${diffDays} dias atrás`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
        } else {
          return formatDate(date);
        }
      }
    };

    return (
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <h3>Linha do Tempo de Transações</h3>
          
          <div className={styles.timelineControls}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              )}
            </div>
            
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterButton} ${timelineFilter === 'all' ? styles.activeFilter : ''}`}
                onClick={() => setTimelineFilter('all')}
              >
                Todos
              </button>
              <button
                className={`${styles.filterButton} ${timelineFilter === 'income' ? styles.activeFilter : ''}`}
                onClick={() => setTimelineFilter('income')}
              >
                Receitas
              </button>
              <button
                className={`${styles.filterButton} ${timelineFilter === 'expense' ? styles.activeFilter : ''}`}
                onClick={() => setTimelineFilter('expense')}
              >
                Despesas
              </button>
            </div>
            
          </div>
        </div>
        
        {filteredData.length === 0 ? (
          <div className={styles.emptyTimeline}>
            <div className={styles.emptyIcon}>💸</div>
            <p>Nenhuma transação encontrada{
              timelineFilter !== 'all' 
                ? ` para o tipo "${timelineFilter === 'income' ? 'receita' : 'despesa'}"` 
                : ''
            }{
              searchTerm 
                ? ` com o termo "${searchTerm}"` 
                : ''
            }.</p>
            {(timelineFilter !== 'all' || searchTerm) && (
              <button
                className={styles.clearFilterButton}
                onClick={() => {
                  console.log('Limpando todos os filtros da timeline');
                  setTimelineFilter('all');
                  setSearchTerm('');
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : groupByDate ? (
          <div className={styles.timeline}>
            {groupedArray.map(group => (
              <div key={group.date.toISOString()} className={styles.timelineGroup}>
                <div className={styles.timelineGroupHeader}>
                  <div className={styles.timelineDate}>
                    <span className={styles.relativeDate}>{getRelativeDate(group.date)}</span>
                    <span className={styles.actualDate}>{formatDate(group.date)}</span>
                  </div>
                  
                  {hasDailyTotal(group.items) && (
                    <div className={styles.dailyTotal}>
                      <div className={styles.dailyTotalItem}>
                        <span className={styles.dailyTotalLabel}>Receitas:</span>
                        <span className={styles.dailyTotalValue}>
                          {formatCurrency(calculateDailyTotal(group.items).income)}
                          </span>
                      </div>
                      <div className={styles.dailyTotalItem}>
                        <span className={styles.dailyTotalLabel}>Despesas:</span>
                        <span className={styles.dailyTotalValue}>
                          {formatCurrency(calculateDailyTotal(group.items).expense)}
                        </span>
                      </div>
                      <div className={styles.dailyTotalItem}>
                        <span className={styles.dailyTotalLabel}>Saldo:</span>
                        <span className={`${styles.dailyTotalValue} ${
                          calculateDailyTotal(group.items).balance >= 0 
                            ? styles.positiveBalance 
                            : styles.negativeBalance
                        }`}>
                          {formatCurrency(calculateDailyTotal(group.items).balance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={styles.timelineItems}>
                  {group.items.map(item => (
                    <div 
                      key={item.id} 
                      className={`${styles.timelineItem} ${
                        item.type === 'income' ? styles.incomeItem : styles.expenseItem
                      }`}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className={styles.timelineItemHeader}>
                        <div className={styles.timelineItemIcon}>
                          {item.type === 'income' ? '💰' : '💸'}
                        </div>
                        <div className={styles.timelineItemInfo}>
                          <div className={styles.timelineItemDescription}>
                            {item.description}
                            {item.is_recurring && (
                              <span className={styles.recurringTag}>Recorrente</span>
                            )}
                          </div>
                          <div className={styles.timelineItemMeta}>
                            <span className={styles.timelineItemCategory}>{item.category}</span>
                            {item.bank !== 'Sem banco' && (
                              <>
                                <span className={styles.metaSeparator}>•</span>
                                <span className={styles.timelineItemBank}>{item.bank}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={styles.timelineItemAmount}>
                          <span className={`${item.type === 'income' ? styles.incomeAmount : styles.expenseAmount}`}>
                            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className={styles.expandIcon}>
                          {expandedItems.includes(item.id) ? '▼' : '▶'}
                        </div>
                      </div>
                      
                      {expandedItems.includes(item.id) && (
                        <div className={styles.timelineItemDetails}>
                          <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Tipo:</span>
                              <span className={styles.detailValue}>
                                {item.type === 'income' ? 'Receita' : 'Despesa'}
                              </span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Data:</span>
                              <span className={styles.detailValue}>{formatDate(item.date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Categoria:</span>
                              <span className={styles.detailValue}>{item.category}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Banco:</span>
                              <span className={styles.detailValue}>{item.bank}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Recorrente:</span>
                              <span className={styles.detailValue}>{item.is_recurring ? 'Sim' : 'Não'}</span>
                            </div>
                          </div>
                          
                          <div className={styles.detailActions}>
                            <button 
                              className={styles.detailActionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/${item.type === 'income' ? 'incomes' : 'expenses'}/edit/${item.id}`);
                              }}
                            >
                              <BsPencil size={16} style={{marginRight: '6px'}} /> Editar
                            </button>
                            <button 
                              className={styles.detailActionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Implementar visualização de detalhes
                              }}
                            >
                              <BsEye size={16} style={{marginRight: '6px'}} /> Ver detalhes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                      </div>
                    </div>
                  ))}
          </div>
        ) : (
          <div className={styles.timeline}>
            {filteredData.map(item => (
              <div 
                key={item.id} 
                className={`${styles.timelineItem} ${
                  item.type === 'income' ? styles.incomeItem : styles.expenseItem
                }`}
                onClick={() => toggleExpand(item.id)}
              >
                {/* Conteúdo do item não agrupado similar ao conteúdo agrupado */}
                <div className={styles.timelineItemHeader}>
                  <div className={styles.timelineItemDateNonGrouped}>
                    <span className={styles.relativeDate}>{getRelativeDate(item.date)}</span>
                    <span className={styles.actualDate}>{formatDate(item.date)}</span>
                  </div>
                  <div className={styles.timelineItemIcon}>
                    {item.type === 'income' ? '💰' : '💸'}
                  </div>
                  <div className={styles.timelineItemInfo}>
                    <div className={styles.timelineItemDescription}>
                      {item.description}
                      {item.is_recurring && (
                        <span className={styles.recurringTag}>Recorrente</span>
                      )}
                    </div>
                    <div className={styles.timelineItemMeta}>
                      <span className={styles.timelineItemCategory}>{item.category}</span>
                      {item.bank !== 'Sem banco' && (
                        <>
                          <span className={styles.metaSeparator}>•</span>
                          <span className={styles.timelineItemBank}>{item.bank}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.timelineItemAmount}>
                    <span className={`${item.type === 'income' ? styles.incomeAmount : styles.expenseAmount}`}>
                      {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className={styles.expandIcon}>
                    {expandedItems.includes(item.id) ? '▼' : '▶'}
                  </div>
                </div>
                
                {expandedItems.includes(item.id) && (
                  <div className={styles.timelineItemDetails}>
                    {/* Detalhes do item não agrupado similar aos detalhes agrupados */}
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Tipo:</span>
                        <span className={styles.detailValue}>
                          {item.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Data:</span>
                        <span className={styles.detailValue}>{formatDate(item.date)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Categoria:</span>
                        <span className={styles.detailValue}>{item.category}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Banco:</span>
                        <span className={styles.detailValue}>{item.bank}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Recorrente:</span>
                        <span className={styles.detailValue}>{item.is_recurring ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                    
                    <div className={styles.detailActions}>
                      <button 
                        className={styles.detailActionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/${item.type === 'income' ? 'incomes' : 'expenses'}/edit/${item.id}`);
                        }}
                      >
                        <BsPencil size={16} style={{marginRight: '6px'}} /> Editar
                      </button>
                      <button 
                        className={styles.detailActionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Implementar visualização de detalhes
                        }}
                      >
                        <BsEye size={16} style={{marginRight: '6px'}} /> Ver detalhes
                      </button>
                    </div>
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    );
  };

  // Hooks de efeito para processar dados de categoria
  useEffect(() => {
    // Remove the activeSection check to ensure data is processed
    // if (activeSection !== 'analytics') return;
    
    const processCategoryData = () => {
      setCategoriesLoading(true);
      try {
        console.log("Processing expense category data, transactions:", transactions?.length);
        if (!transactions || transactions.length === 0) {
          console.log("No transactions for expense categories");
          setCategoryData([]);
          setCategoriesLoading(false);
          return;
        }
        
        // Use only the transactions filtered by the API (no additional filtering needed)
        // The transactions are already filtered based on the queryParams sent to the API
        const filteredTransactions = transactions.filter(transaction => 
          transaction.type === 'expense'
        );
        
        console.log("Filtered expense transactions:", filteredTransactions.length);
        
        // Group by category and calculate totals
        const categoryTotals = {};
        filteredTransactions.forEach(transaction => {
          const category = transaction.category || 'Sem categoria';
          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }
          categoryTotals[category] += transaction.amount;
        });
        
        // Convert to array format for chart
        const result = Object.keys(categoryTotals).map(category => ({
          category,
          amount: categoryTotals[category],
          percentage: 0 // Will calculate after
        }));
        
        // Calculate percentage
        const totalAmount = result.reduce((sum, item) => sum + item.amount, 0);
        result.forEach(item => {
          item.percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
        });
        
        // Sort by amount (descending)
        result.sort((a, b) => b.amount - a.amount);
        
        console.log("Processed expense categories:", result);
        setCategoryData(result);
      } catch (err) {
        console.error("Error processing category data:", err);
        setCategoriesError("Erro ao processar dados de categorias");
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    processCategoryData();
  }, [transactions]); // Remove selectedPeriod from dependencies
  
  // Hooks de efeito para processar dados de renda por categoria
  useEffect(() => {
    // Remove the activeSection check to ensure data is processed
    // if (activeSection !== 'analytics') return;
    
    const processIncomeData = () => {
      setIncomeLoading(true);
      try {
        console.log("Processing income category data, transactions:", transactions?.length);
        if (!transactions || transactions.length === 0) {
          console.log("No transactions for income categories");
          setIncomeCategoryData([]);
          setIncomeLoading(false);
          return;
        }
        
        // Use only the transactions filtered by the API (no additional filtering needed)
        // The transactions are already filtered based on the queryParams sent to the API
        const filteredTransactions = transactions.filter(transaction => 
          transaction.type === 'income'
        );
        
        console.log("Filtered income transactions:", filteredTransactions.length);
        
        // Group by category and calculate totals
        const categoryTotals = {};
        filteredTransactions.forEach(transaction => {
          const category = transaction.category || 'Sem categoria';
          if (!categoryTotals[category]) {
            categoryTotals[category] = {
              total: 0,
              transactions: []
            };
          }
          categoryTotals[category].total += transaction.amount;
          categoryTotals[category].transactions.push(transaction);
        });
        
        // Convert to array format for chart
        const result = Object.keys(categoryTotals).map((category, index) => ({
          id: index,
          category,
          amount: categoryTotals[category].total,
          percentage: 0,
          transactions: categoryTotals[category].transactions,
          color: COLORS ? COLORS[index % COLORS.length] : '#' + Math.floor(Math.random()*16777215).toString(16)
        }));
        
        // Calculate percentage
        const totalAmount = result.reduce((sum, item) => sum + item.amount, 0);
        result.forEach(item => {
          item.percentage = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
        });
        
        // Sort by amount (descending)
        result.sort((a, b) => b.amount - a.amount);
        
        console.log("Processed income categories:", result);
        setIncomeCategoryData(result);
      } catch (err) {
        console.error("Error processing income category data:", err);
        setIncomeError("Erro ao processar dados de categorias de renda");
      } finally {
        setIncomeLoading(false);
      }
    };
    
    processIncomeData();
  }, [transactions]); // Remove selectedPeriod from dependencies
  
  const renderCategoriesChart = () => {
    const handlePeriodChange = (period) => {
      setSelectedPeriod(period);
    };
    
    if (categoriesLoading) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Despesas por Categoria</h3>
            <div className={styles.periodButtons}>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                <span className={styles.periodIcon}>📅</span>
                Mês
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'year' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                <span className={styles.periodIcon}>📆</span>
                Ano
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'all' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
                <span className={styles.periodIcon}>🔍</span>
                Todos
              </button>
            </div>
          </div>
          <div className={styles.loadingState}>Carregando dados de categorias...</div>
        </div>
      );
    }
    
    if (categoriesError) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Despesas por Categoria</h3>
          </div>
          <div className={styles.errorState}>{categoriesError}</div>
        </div>
      );
    }
    
    if (!categoryData?.length) {
      console.log("No category data to display");
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Despesas por Categoria</h3>
            <div className={styles.periodButtons}>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                <span className={styles.periodIcon}>📅</span>
                Mês
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'year' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                <span className={styles.periodIcon}>📆</span>
                Ano
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'all' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
                <span className={styles.periodIcon}>🔍</span>
                Todos
              </button>
            </div>
          </div>
          <div className={styles.emptyState}>
            Nenhuma despesa encontrada{selectedPeriod === 'month' ? ' neste mês' : 
            selectedPeriod === 'year' ? ' neste ano' : ''}.
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Despesas por Categoria</h3>
          <div className={styles.periodButtons}>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              <span className={styles.periodIcon}>📅</span>
              Mês
            </button>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'year' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('year')}
            >
              <span className={styles.periodIcon}>📆</span>
              Ano
            </button>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'all' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
              <span className={styles.periodIcon}>🔍</span>
              Todos
            </button>
          </div>
        </div>
        
        <div className={styles.categoriesPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                      cx="50%"
                      cy="50%"
                labelLine={false}
                      outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="amount"
                nameKey="category"
                label={({name, percent}) => name && percent ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
              >
                {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
                  </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.categoriesInsights}>
          <h4>Categoria principal: {categoryData[0]?.category || 'Nenhuma'}</h4>
          <p>
            Representa {categoryData[0]?.percentage ? categoryData[0].percentage.toFixed(1) : 0}% dos seus despesas
            {selectedPeriod === 'month' ? ' neste mês' : 
             selectedPeriod === 'year' ? ' neste ano' : ' no total'}.
          </p>
        </div>
      </div>
    );
  };

  const renderIncomeCategoriesChart = () => {
    const handlePeriodChange = (period) => {
      setSelectedPeriod(period);
    };
    
    console.log("Rendering income category chart, data:", incomeCategoryData);
    
    if (incomeLoading) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Receitas por Categoria</h3>
            <div className={styles.chartSubtitle}>
              <span className={styles.dateFilterBadge}>
                <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
              </span>
            </div>
          </div>
          <div className={styles.loadingState}>Carregando dados de fontes de renda...</div>
        </div>
      );
    }
    
    if (incomeError) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Receitas por Categoria</h3>
          </div>
          <div className={styles.errorState}>{incomeError}</div>
        </div>
      );
    }
    
    if (!incomeCategoryData?.length) {
      console.log("No income category data to display");
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Receitas por Categoria</h3>
            <div className={styles.periodButtons}>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                <span className={styles.periodIcon}>📅</span>
                Mês
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'year' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                <span className={styles.periodIcon}>📆</span>
                Ano
              </button>
              <button 
                className={`${styles.periodButton} ${selectedPeriod === 'all' ? styles.activePeriod : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
                <span className={styles.periodIcon}>🔍</span>
                Todos
              </button>
            </div>
          </div>
          <div className={styles.emptyState}>
            Nenhuma receita encontrada{selectedPeriod === 'month' ? ' neste mês' : 
            selectedPeriod === 'year' ? ' neste ano' : ''}.
          </div>
        </div>
      );
    }
    
    // Calculate diversification score
    const diversificationScore = Math.min(100, incomeCategoryData.length * 15);
    const primaryIncomePercentage = incomeCategoryData[0].percentage;
    const isDiversified = primaryIncomePercentage < 70;
    const totalIncome = incomeCategoryData.reduce((sum, item) => sum + item.amount, 0);
    
    // Make sure each income category has a unique color
    const INCOME_COLORS = [
      '#4CAF50', // Green
      '#2196F3', // Blue
      '#00BCD4', // Cyan
      '#3F51B5', // Indigo
      '#8BC34A', // Light Green
      '#009688', // Teal
      '#03A9F4', // Light Blue
      '#FFEB3B', // Yellow
      '#FFC107', // Amber
      '#673AB7', // Deep Purple
      '#9C27B0', // Purple
      '#607D8B', // Blue Grey
      '#CDDC39', // Lime
      '#795548'  // Brown
    ];
    
    const incomeCategoriesWithColors = incomeCategoryData.map((item, index) => ({
      ...item,
      color: INCOME_COLORS[index % INCOME_COLORS.length]
    }));
    
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Receitas por Categoria</h3>
          <div className={styles.periodButtons}>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              <span className={styles.periodIcon}>📅</span>
              Mês
            </button>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'year' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('year')}
            >
              <span className={styles.periodIcon}>📆</span>
              Ano
            </button>
            <button 
              className={`${styles.periodButton} ${selectedPeriod === 'all' ? styles.activePeriod : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
              <span className={styles.periodIcon}>🔍</span>
              Todos
            </button>
          </div>
        </div>

        <div className={styles.categoriesPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <Pie
                data={incomeCategoriesWithColors}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="amount"
                nameKey="category"
                paddingAngle={2}
                label={({category, percent}) => category && percent ? `${category}: ${(percent * 100).toFixed(1)}%` : ''}
              >
                {incomeCategoriesWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.categoriesInsights}>
          <h4>Diversificação de Renda</h4>
          <div className={styles.infoItem}>
            <span>Total de Receitas:</span>
            <strong>{formatCurrency(totalIncome)}</strong>
          </div>
          <div className={styles.diversificationScore}>
            <div className={styles.diversificationBar}>
              <div 
                className={styles.diversificationFill} 
                style={{ 
                  width: `${diversificationScore}%`,
                  backgroundColor: isDiversified ? '#4caf50' : '#ff9800'
                }}
              />
            </div>
            <div className={styles.diversificationLabel}>
              {isDiversified 
                ? 'Sua renda está bem diversificada' 
                : `${incomeCategoryData[0]?.category || 'Categoria principal'} representa ${primaryIncomePercentage ? primaryIncomePercentage.toFixed(1) : 0}% da sua renda`}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBanksChart = () => {
    if (!data?.expenses_by_bank?.length) {
      return (
        <div className={`${styles.chartContainer} ${styles.emptyChartCard}`}>
          <h3>Distribuição por Banco</h3>
          <div className={styles.emptyChartContent}>
            <span className={styles.emptyChartIcon}>🏦</span>
            <p>Não há despesas por banco no período selecionado.</p>
          </div>
        </div>
      );
    }

    // Preparar dados para o gráfico de pizza
    const bankData = data.expenses_by_bank.map((bank, index) => ({
      name: bank.bank_name,
      value: bank.total,
      color: COLORS[index % COLORS.length]
    }));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Distribuição por Banco</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div className={styles.bankPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <Pie
                data={bankData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                label={({name, percent}) => name && percent ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
              >
                {bankData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value)} 
                contentStyle={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  padding: '10px',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.bankInsights}>
          <h4>Banco principal: {bankData[0]?.name}</h4>
          <p className={styles.bankChartDesc}>
            {bankData[0] && 
              `${bankData[0].name} é seu banco mais utilizado. ${((bankData[0].value / bankData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}% das despesas estão neste banco.`
            }
          </p>
        </div>
      </div>
    );
  };

  // New function to generate financial insights based on the available data
  const generateFinancialInsights = () => {
    if (!data) return [];
    
    const insights = [];
    
    // Budget status
    if (data.budget_info) {
      const { percentage_spent } = data.budget_info;
      
      if (percentage_spent > 90) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          title: 'Orçamento quase esgotado',
          description: `Você já utilizou ${percentage_spent.toFixed(1)}% do seu orçamento mensal.`,
          action: {
            text: 'Ver Orçamento',
            handler: () => navigate('/budget')
          }
        });
      } else if (percentage_spent > 75) {
        insights.push({
          type: 'info',
          icon: '📊',
          title: 'Orçamento em alerta',
          description: `Você já utilizou ${percentage_spent.toFixed(1)}% do seu orçamento mensal.`,
          action: {
            text: 'Ver Orçamento',
            handler: () => navigate('/budget')
          }
        });
      }
    }
    
    // Income diversification
    if (data.incomes_by_category && data.incomes_by_category.length > 0) {
      const totalIncome = data.incomes_by_category.reduce((sum, cat) => sum + cat.total, 0);
      const primaryIncome = data.incomes_by_category[0]; // Assuming sorted by amount
      
      if (primaryIncome && (primaryIncome.total / totalIncome) > 0.8) {
        insights.push({
          type: 'warning',
          icon: '💰',
          title: 'Fonte de renda única',
          description: `${primaryIncome.category_name} representa ${((primaryIncome.total / totalIncome) * 100).toFixed(0)}% da sua renda.`,
          action: {
            text: 'Ver Receitas',
            handler: () => navigate('/incomes')
          }
        });
      }
    }
    
    // Expense categories
    if (data.expenses_by_category && data.expenses_by_category.length > 0) {
      const largestExpense = data.expenses_by_category[0]; // Assuming sorted
      const totalExpenses = data.expenses_by_category.reduce((sum, cat) => sum + cat.total, 0);
      
      if (largestExpense && (largestExpense.total / totalExpenses) > 0.4) {
        insights.push({
          type: 'info',
          icon: '📈',
          title: 'Categoria de despesa significativa',
          description: `${largestExpense.category_name} representa ${((largestExpense.total / totalExpenses) * 100).toFixed(0)}% dos seus despesas.`,
          action: {
            text: 'Ver Detalhes',
            handler: () => setActiveSection('analytics')
          }
        });
      }
    }
    
    // Financial goals
    if (data.financial_goals && data.financial_goals.length > 0) {
      const unachievableGoals = data.financial_goals.filter(goal => {
        if (!goal.target_date || !goal.current_amount || !goal.target_amount) 
          return false;
          
        const targetDate = new Date(goal.target_date);
        const now = new Date();
        const monthsRemaining = (targetDate.getFullYear() - now.getFullYear()) * 12 + 
                              (targetDate.getMonth() - now.getMonth());
                              
        const amountRemaining = goal.target_amount - goal.current_amount;
        const requiredMonthlySavings = amountRemaining / monthsRemaining;
        
        // If user needs to save more than 40% of monthly income
        return requiredMonthlySavings > (data.total_incomes * 0.4);
      });
      
      if (unachievableGoals.length > 0) {
        insights.push({
          type: 'warning',
          icon: '🎯',
          title: 'Meta financeira desafiadora',
          description: `${unachievableGoals[0].name} pode exigir economia maior que o viável.`,
          action: {
            text: 'Revisar Metas',
            handler: () => navigate('/goals')
          }
        });
      }
    }
    
    // Savings rate
    if (data.balance !== undefined && data.total_incomes !== undefined) {
      const savingsRate = (data.balance / data.total_incomes) * 100;
      
      if (data.balance < 0) {
        insights.push({
          type: 'danger',
          icon: '❗',
          title: 'Saldo negativo',
          description: 'Suas despesas ultrapassaram suas receitas neste período.',
          action: {
            text: 'Ver Transações',
            handler: () => setActiveSection('transactions')
          }
        });
      } else if (savingsRate < 10) {
        insights.push({
          type: 'warning',
          icon: '💸',
          title: 'Taxa de economia baixa',
          description: `Você está economizando apenas ${savingsRate.toFixed(1)}% da sua renda.`,
          action: {
            text: 'Ver Dicas',
            handler: () => window.open('/tips', '_blank')
          }
        });
      }
    }
    
    return insights;
  };
  
  const insights = generateFinancialInsights();

  // Adicionar a função filterData antes dos componentes de gráficos que a utilizam
  const filterData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    // Aplicar o filtro global de período
    let filteredData = [...data];
    
    if (selectedPeriod) {
      let startDate, endDate;
      
      if (selectedPeriod === 'month' || selectedPeriod === 'current') {
        // Mês atual
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'year') {
        // Ano atual
        const now = new Date();
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'last') {
        // Mês anterior
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedPeriod === 'custom' && customDateRange) {
        // Período personalizado
        if (customDateRange.startNormalized) {
          startDate = new Date(customDateRange.startNormalized);
          endDate = new Date(customDateRange.endNormalized);
        } else {
          // Compatibilidade com dados antigos
          const [startYear, startMonth, startDay] = customDateRange.start.split('-').map(num => parseInt(num, 10));
          const [endYear, endMonth, endDay] = customDateRange.end.split('-').map(num => parseInt(num, 10));
          
          startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        }
      }
      
      // Se temos um período definido, filtramos os dados
      if (startDate && endDate) {
        console.log(`Aplicando filtro de período: ${startDate.toISOString()} - ${endDate.toISOString()}`);
        
        filteredData = data.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        });
        
        console.log(`Dados filtrados: ${filteredData.length} de ${data.length} registros`);
      }
    }
    
    return filteredData;
  };
  
  // Definir as variáveis de dados para os gráficos
  const expenseData = allExpenses || [];
  const incomeData = allIncomes || [];

  // Função para formatar labels de datas
  const formatDateLabel = (label) => {
    if (!label) return '';
    if (typeof label === 'string') {
      // Se for uma string de data no formato "YYYY-MM-DD"
      const parts = label.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return label;
    }
    if (label instanceof Date) {
      // Se for um objeto Date
      return label.toLocaleDateString('pt-BR');
    }
    return label.toString();
  };

  const renderExpensesTrend = () => {
    // Usando todos os dados de despesas, independente dos filtros
    if (!expenseData?.length) {
      return (
        <div className={styles.emptyChart}>
          <p>Não há dados de despesas para exibir</p>
          </div>
      );
    }

    // Agrupando despesas por mês
    const groupedData = {};
    
    // Obtendo a data atual e a data limite de 5 anos no futuro
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(currentDate.getFullYear() + 5);
    
    expenseData.forEach(expense => {
      const date = new Date(expense.date);
      
      // Ignorar datas que estão além dos próximos 5 anos
      if (date > futureDate) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = {
          date: monthKey,
          total: 0
        };
      }
      
      groupedData[monthKey].total += parseFloat(expense.amount || 0);
    });
    
    // Convertendo para array e ordenando por data
    const chartData = Object.values(groupedData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Gerando meses futuros (projeção) até completar 5 anos a partir de hoje
    const lastDataPoint = chartData.length > 0 ? new Date(chartData[chartData.length - 1].date) : new Date();
    let projectionDate = new Date(lastDataPoint);
    
    // Calcular média dos últimos 6 meses ou o que estiver disponível
    const recentMonths = chartData.slice(-6);
    const avgExpense = recentMonths.length > 0 
      ? recentMonths.reduce((sum, item) => sum + item.total, 0) / recentMonths.length 
      : 0;
    
    // Adicionar projeção para completar 5 anos a partir de hoje
    while (projectionDate < futureDate) {
      projectionDate.setMonth(projectionDate.getMonth() + 1);
      
      // Pular se já existe um dado para este mês (evitar duplicações)
      const projMonthKey = `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`;
      if (groupedData[projMonthKey]) continue;
      
      chartData.push({
        date: projMonthKey,
        total: avgExpense,
        isProjection: true
      });
    }

    // Ordenando novamente após adicionar projeções
    chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Despesas ao longo do tempo</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44336" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f44336" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorProjectedExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44336" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f44336" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(tick) => {
                  if (typeof tick !== 'string') {
                    // Se o tick for um objeto Date ou outro tipo, converta para string
                    if (tick instanceof Date) {
                      const month = tick.getMonth() + 1;
                      const year = tick.getFullYear();
                      return `${months.find(m => m.value === month)?.shortLabel || month}/${year.toString().slice(2)}`;
                    }
                    return String(tick);
                  }
                  
                  // Verifica se o formato é YYYY-MM ou YYYY-MM-DD
                  const parts = tick.split('-');
                  if (parts.length >= 2) {
                    const year = parts[0];
                    const month = parseInt(parts[1], 10);
                    return `${months.find(m => m.value === month)?.shortLabel || month}/${year.slice(2)}`;
                  }
                  
                  return tick;
                }}
                angle={-30}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
                tickMargin={10}
              />
              <YAxis 
                tickFormatter={formatCurrency} 
                width={65}
                tickMargin={5}
              />
              <Tooltip 
                formatter={value => formatCurrency(value)} 
                labelFormatter={(label) => {
                  if (typeof label !== 'string') {
                    if (label instanceof Date) {
                      const month = label.getMonth() + 1;
                      const year = label.getFullYear();
                      const dataPoint = chartData.find(d => {
                        if (d.date instanceof Date) {
                          return d.date.getMonth() === label.getMonth() && 
                                 d.date.getFullYear() === label.getFullYear();
                        }
                        return false;
                      });
                      const monthName = months.find(m => m.value === month)?.label || month;
                      return `${monthName}/${year}${dataPoint?.isProjection ? ' (Projeção)' : ''}`;
                    }
                    return String(label);
                  }
                  
                  const parts = label.split('-');
                  if (parts.length >= 2) {
                    const year = parts[0];
                    const month = parseInt(parts[1], 10);
                    const dataPoint = chartData.find(d => d.date === label);
                    const monthName = months.find(m => m.value === month)?.label || month;
                    return `${monthName}/${year}${dataPoint?.isProjection ? ' (Projeção)' : ''}`;
                  }
                  
                  return label;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#f44336" 
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
                name="Despesas"
                strokeDasharray={(d) => d.isProjection ? "5 5" : "0"}
              />
              <ReferenceLine 
                x={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                stroke="#666" 
                strokeDasharray="3 3" 
                label={{ value: 'Hoje', position: 'insideTopRight', fill: '#666' }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderIncomeTrend = () => {
    const chartData = filterData(incomeData).map(item => {
      // Garantir que a data esteja no formato correto
      let formattedDate;
      if (item.date instanceof Date) {
        // Se já for um objeto Date, formatar como YYYY-MM
        const year = item.date.getFullYear();
        const month = String(item.date.getMonth() + 1).padStart(2, '0');
        formattedDate = `${year}-${month}`;
      } else if (typeof item.date === 'string') {
        // Se for string, verificar o formato
        if (item.date.includes('T')) {
          // Se for ISO string (com timestamp), extrair apenas a data
          formattedDate = item.date.split('T')[0].substring(0, 7); // YYYY-MM
        } else if (item.date.includes('-')) {
          // Se já for no formato YYYY-MM-DD, extrair apenas ano e mês
          formattedDate = item.date.substring(0, 7); // YYYY-MM
        } else {
          formattedDate = item.date;
        }
      } else {
        formattedDate = String(item.date);
      }
      
      return {
        date: formattedDate,
        value: item.amount
      };
    });
    
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Receitas ao longo do tempo</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(tick) => {
                  if (typeof tick !== 'string') {
                    // Se o tick for um objeto Date ou outro tipo, converta para string
                    if (tick instanceof Date) {
                      const month = tick.getMonth() + 1;
                      const year = tick.getFullYear();
                      return `${months.find(m => m.value === month)?.shortLabel || month}/${year.toString().slice(2)}`;
                    }
                    return String(tick);
                  }
                  
                  // Verifica se o formato é YYYY-MM ou YYYY-MM-DD
                  const parts = tick.split('-');
                  if (parts.length >= 2) {
                    const year = parts[0];
                    const month = parseInt(parts[1], 10);
                    return `${months.find(m => m.value === month)?.shortLabel || month}/${year.slice(2)}`;
                  }
                  
                  return tick;
                }}
                angle={-30}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
                tickMargin={10}
              />
              <YAxis 
                tickFormatter={formatCurrency} 
                width={65}
                tickMargin={5}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Receita']} 
                labelFormatter={(label) => formatDateLabel(label)}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#2196F3" 
                fillOpacity={1} 
                fill="url(#colorIncome)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderOverviewCharts = () => (
    <>
      {/* Exibir o orçamento e o objetivo financeiro lado a lado */}
      <div className={styles.chartsGrid}>
        {/* Orçamento em destaque */}
        <div className={`${styles.chartContainer} ${styles.highlightedChart}`}>
          {renderBudgetChart()}
        </div>
        
        {/* Objetivo financeiro ao lado do orçamento */}
        <div className={`${styles.chartContainer} ${styles.highlightedChart}`}>
          {renderFinancialGoalChart()}
        </div>
      </div>
      
      <div className={styles.chartsGrid}>
        {/* Main Charts */}
        <div className={styles.chartContainer}>
          {renderExpensesTrend()}
        </div>
        
        <div className={styles.chartContainer}>
          {renderIncomeTrend()}
        </div>
        
        {/* Categories Charts */}
        <div className={styles.chartContainer}>
          {/* Use renderExpensesByCategoryChart() for the overview section instead of renderCategoriesChart() */}
          {renderExpensesByCategoryChart()}
        </div>
        
        <div className={styles.chartContainer}>
          {/* Use directly the income chart here */}
          {renderIncomeCategoriesChart()}
        </div>
        
        <div className={styles.chartContainer}>
          {renderBanksChart()}
        </div>
        
        <div className={styles.chartContainer}>
          {renderIncomeVsExpensesChart()}
        </div>
      </div>
    </>
  );

  if (loading) return (
    <div className={styles.dashboardLoading}>
      <div className={styles.loadingSpinner}></div>
      <h3>Carregando seu dashboard financeiro...</h3>
      <p>Estamos processando seus dados para fornecer insights personalizados.</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.dashboardError}>
      <div className={styles.errorIcon}>⚠️</div>
      <h3>Ops! Ocorreu um erro.</h3>
      <p>{error}</p>
      <button 
        className={styles.retryButton} 
        onClick={() => {
          setLoading(true);
          setError(null);
          
          // Usando try/catch para tratar possíveis erros na chamada das funções
          try {
            const fetchDataPromise = fetchData();
            const fetchAllTransactionsPromise = fetchAllTransactions();
            
            // Execute as duas chamadas em paralelo
            Promise.all([fetchDataPromise, fetchAllTransactionsPromise])
              .catch(err => {
                console.error("Erro ao tentar novamente:", err);
                setError("Falha ao reconectar. Verifique sua conexão e tente novamente.");
                setLoading(false);
              });
          } catch (err) {
            console.error("Erro ao iniciar tentativa:", err);
            setError("Não foi possível iniciar a reconexão. Recarregue a página.");
            setLoading(false);
          }
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
  
  if (!data) return (
    <div className={styles.dashboardEmpty}>
      <div className={styles.emptyIcon}>📊</div>
      <h3>Nenhum dado disponível</h3>
      <p>Parece que você ainda não tem transações registradas.</p>
      <div className={styles.emptyActions}>
        <button onClick={() => navigate('/add-expense')}>Adicionar Despesa</button>
        <button onClick={() => navigate('/incomes/add')}>Adicionar Receita</button>
        </div>
      </div>
    );

  // Formatação segura de datas para evitar problemas de timezone
  const formatDateStringWithTimezone = (dateString) => {
    // Evitar problemas de timezone na exibição de datas
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.toLocaleDateString('pt-BR');
  };

  // Retorna o texto do filtro de período ativo
  const getActiveFilterLabel = () => {
    if (selectedPeriod === 'current') return 'Mês Atual';
    if (selectedPeriod === 'last') return 'Mês Anterior';
    if (selectedPeriod === 'next') return 'Mês que vem';
    if (selectedPeriod === 'year') return 'Ano Atual';
    return 'Selecione um período';
  };

  return (
    <div className={styles.dashboardContainer}>
      {getGreeting(auth.user?.name)}
      <div className={styles.dashboardHeader}>
        <div className={styles.navigationTabs}>
          <button
            className={`${styles.navTab} ${activeSection === 'overview' ? styles.activeTab : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className={styles.tabIcon}>📊</span>
            Visão Geral
          </button>
          <button
            className={`${styles.navTab} ${activeSection === 'transactions' ? styles.activeTab : ''}`}
            onClick={() => setActiveSection('transactions')}
          >
            <span className={styles.tabIcon}>💸</span>
            Transações
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filterRow}>
        <div className={styles.filtersContainer}>
          <div className={styles.filterSelector}>
            <div className={styles.filterLabel}>Período</div>
            <div 
              className={`${styles.filterDisplay} ${showPeriodOptions ? styles.active : ''}`}
              onClick={() => setShowPeriodOptions(!showPeriodOptions)}
            >
              {selectedPeriod === 'custom' && customDateRange
                ? `${formatDateStringWithTimezone(customDateRange.start)} - ${formatDateStringWithTimezone(customDateRange.end)}`
                : getActiveFilterLabel()
              }
              <FaChevronDown className={`${styles.arrowIcon} ${showPeriodOptions ? styles.rotated : ''}`} />
            </div>
            {showPeriodOptions && (
              <div className={styles.filterOptions}>
                <div 
                  className={styles.filterOption}
                  onClick={() => handlePeriodChange('current')}
                >
                  Mês Atual
                </div>
                <div 
                  className={styles.filterOption}
                  onClick={() => handlePeriodChange('last')}
                >
                  Mês Anterior
                </div>
                <div 
                  className={styles.filterOption}
                  onClick={() => handlePeriodChange('next')}
                >
                  Mês que vem
                </div>
                <div 
                  className={styles.filterOption}
                  onClick={() => handlePeriodChange('custom')}
                >
                  Personalizado
                </div>
              </div>
            )}
          </div>
          {showDateRangePicker && (
            <div className={styles.dateRangePickerContainer}>
              <DateRangePicker onDateRangeSelect={handleDateRangeSelect} onCancel={handleDateRangeCancel} />
            </div>
          )}
          <FilterSelector
            label="Categoria"
            options={categories}
            selected={selectedCategories}
            onSelect={handleCategoryChange}
            multiple
          />
          <FilterSelector
            label="Banco"
            options={banks}
            selected={selectedBanks}
            onSelect={handleBankChange}
            multiple
          />
        </div>
        {!hasExpenses && !hasIncome && (
          <div className={styles.emptyStateContainer}>
            <FaChartLine className={styles.emptyStateIcon} />
            <div className={styles.emptyStateContent}>
              <div className={styles.emptyStateMessage}>
                Você ainda não tem despesas ou receitas cadastradas para este período.
              </div>
              <div className={styles.emptyStateSuggestion}>
                Que tal começar adicionando sua primeira transação?
              </div>
              <div className={styles.emptyStateButtons}>
                <button 
                  className={styles.addExpenseButton}
                  onClick={() => navigate('/add-expense')}
                >
                  <FaPlus /> Adicionar Despesa
                </button>
                <button 
                  className={styles.addIncomeButton}
                  onClick={() => navigate('/add-income')}
                >
                  <FaPlus /> Adicionar Receita
                </button>
              </div>
            </div>
          </div>
        )}
        
        {hasExpenses === false && hasIncome === true && (
          <div className={styles.emptyStateContainer}>
            <FaChartLine className={styles.emptyStateIcon} />
            <div className={styles.emptyStateContent}>
              <div className={styles.emptyStateMessage}>
                Você tem receitas cadastradas, mas ainda não tem despesas para este período.
              </div>
              <div className={styles.emptyStateSuggestion}>
                Que tal adicionar sua primeira despesa?
              </div>
              <div className={styles.emptyStateButtons}>
                <button 
                  className={styles.addExpenseButton}
                  onClick={() => navigate('/add-expense')}
                >
                  <FaPlus /> Adicionar Despesa
                </button>
              </div>
            </div>
          </div>
        )}
        
        {hasExpenses === true && hasIncome === false && (
          <div className={styles.emptyStateContainer}>
            <FaChartLine className={styles.emptyStateIcon} />
            <div className={styles.emptyStateContent}>
              <div className={styles.emptyStateMessage}>
                Você tem despesas cadastradas, mas ainda não tem receitas para este período.
              </div>
              <div className={styles.emptyStateSuggestion}>
                Que tal adicionar sua primeira receita?
              </div>
              <div className={styles.emptyStateButtons}>
                <button 
                  className={styles.addIncomeButton}
                  onClick={() => navigate('/add-income')}
                >
                  <FaPlus /> Adicionar Receita
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo baseado na seção selecionada - só mostra se tiver despesas E receitas */}
      {(hasExpenses && hasIncome) && (
        <div className={styles.dashboardContent}>
          {activeSection === 'overview' && (
            <div className={styles.overviewSection}>
              {/* Conteúdo original do dashboard */}
              {renderOverviewCharts()}
            </div>
          )}
          
          {activeSection === 'transactions' && (
            <div className={styles.transactionsSection}>
              {renderTimelineChart()}
            </div>
          )}
        </div>
      )}      
      
      {/* Mensagem quando há apenas um tipo de transação mas não ambos */}
      {((hasExpenses && !hasIncome) || (!hasExpenses && hasIncome)) && (
        <div className={styles.emptyStateContainer}>
          <FaChartLine className={styles.emptyStateIcon} />
          <div className={styles.emptyStateContent}>
            <div className={styles.emptyStateMessage}>
              Para visualizar os relatórios completos, você precisa ter tanto despesas quanto receitas cadastradas.
            </div>
            <div className={styles.emptyStateSuggestion}>
              {hasExpenses && !hasIncome ? 'Adicione receitas para ver os relatórios completos.' : 'Adicione despesas para ver os relatórios completos.'}
            </div>
            <div className={styles.emptyStateButtons}>
              <button 
                className={hasExpenses ? styles.addIncomeButton : styles.addExpenseButton}
                onClick={() => navigate(hasExpenses ? '/add-income' : '/add-expense')}
              >
                <FaPlus /> {hasExpenses ? 'Adicionar Receita' : 'Adicionar Despesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;