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
} from 'recharts';
import styles from '../styles/dashboard.module.css';
  
const motivationalPhrases = [
  "Cuide do seu dinheiro hoje para não precisar se preocupar amanhã.",
  "Cada real economizado é um passo mais perto da sua liberdade financeira.",
  "Não trabalhe apenas por dinheiro, faça o dinheiro trabalhar para você.",
  "Investir é plantar hoje para colher no futuro.",
  "Quem controla seu dinheiro, controla seu futuro.",
  "Gaste menos do que ganha e invista a diferença.",
  "Disciplina financeira hoje significa tranquilidade amanhã.",
  "Pequenos gastos diários podem se tornar grandes perdas anuais.",
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
    const incomeToExpenseRatio = latestMonth.ganhos / (latestMonth.despesas || 1);
    
    if (incomeToExpenseRatio < 1.1) {
      return "⚠️ Seus gastos estão próximos da sua renda. Considere reduzir despesas não essenciais.";
    } else if (incomeToExpenseRatio > 1.5) {
      return "✅ Você está economizando bem! Considere investir o excedente para futuro crescimento.";
    } else {
      return "ℹ️ Sua relação entre ganhos e despesas está equilibrada. Continue monitorando seus gastos.";
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
                case 'ganhos':
                  color = 'var(--success-color)';
                  value = 'Ganhos';
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
            dataKey="ganhos"
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
          <span>Ganhos Projetados </span>
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
                  <span>Ganhos:</span>
                  <strong className={styles.positive}>
                    {formatFullCurrency(data.projectionData[activeDot].ganhos)}
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
                    {((data.projectionData[activeDot].ganhos - data.projectionData[activeDot].despesas) / 
                      data.projectionData[activeDot].ganhos * 100).toFixed(1)}% da renda
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
        "Revise seus gastos essenciais e corte despesas supérfluas",
        "Estabeleça um orçamento mais rígido para o próximo mês",
        "Considere fontes de renda adicionais"
      ];
    } else if (healthScore < 70) {
      return [
        "Continue acompanhando seus gastos de perto",
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
const FilterSelector = ({ title, options, selected, onChange, type }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggle = () => setIsOpen(!isOpen);
  
  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };
  
  const handleSelect = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };
  
  const getDisplayText = () => {
    if (selected.length === 0) return `Selecione ${title.toLowerCase()}`;
    if (selected.length === options.length) return `Todos ${title.toLowerCase()}`;
    if (selected.length <= 2) {
      return selected.map(value => {
        const option = options.find(opt => opt.value === value);
        return option ? option.label : '';
      }).join(', ');
    }
    return `${selected.length} ${title.toLowerCase()} selecionados`;
  };
  
  return (
    <div className={styles.filterSelector}>
      <div className={styles.filterLabel}>{title}</div>
      <div 
        className={`${styles.filterDisplay} ${isOpen ? styles.active : ''}`} 
        onClick={handleToggle}
      >
        <span>{getDisplayText()}</span>
        <span className={styles.arrowIcon}>{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className={styles.filterOptions}>
          <div className={styles.selectAllOption} onClick={handleSelectAll}>
            <input 
              type="checkbox" 
              checked={selected.length === options.length} 
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
            />
            <span>Selecionar todos</span>
          </div>
          
          <div className={styles.optionsDivider} />
          
          <div className={styles.optionsList}>
            {options.map(option => (
              <div 
                key={option.value} 
                className={`${styles.filterOption} ${selected.includes(option.value) ? styles.selected : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <input 
                  type="checkbox" 
                  checked={selected.includes(option.value)} 
                  onChange={() => {}}
                  onClick={(e) => e.stopPropagation()}
                />
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
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);
  const [openFilter, setOpenFilter] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()]
  });
  // Estado para controlar a seção ativa
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedCharts, setExpandedCharts] = useState({});
  const [chartRefs] = useState({
    balanceTrend: React.createRef(),
    expensesByCategory: React.createRef(),
    budget: React.createRef(),
    'expenses-trend': React.createRef(),
    'income-trend': React.createRef()
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
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [categoryData, setCategoryData] = useState([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [incomeError, setIncomeError] = useState(null);

  // Lista de anos para o filtro
  const years = (() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // 5 anos para trás
    for (let i = 5; i >= 0; i--) {
      years.push({
        value: currentYear - i,
        label: (currentYear - i).toString()
      });
    }
    
    // 10 anos para frente
    for (let i = 1; i <= 10; i++) {
      years.push({
        value: currentYear + i,
        label: (currentYear + i).toString()
      });
    }
    
    return years;
  })();

  // Lista de meses para o filtro
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
  
  // Remover esta linha duplicada
  // const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams();
        
        // Adiciona meses e anos como arrays
        filters.months.forEach(month => queryParams.append('months[]', month));
        filters.years.forEach(year => queryParams.append('years[]', year));

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do dashboard');
        }
        
        const jsonData = await response.json();
        console.log("Dashboard API response:", jsonData);
        
        // APENAS PARA FINS DE DEMONSTRAÇÃO - Gerar dados de exemplo para o balanço bancário
        // Remova esse código em ambiente de produção
        if (!jsonData.bank_balance_trend || jsonData.bank_balance_trend.length === 0) {
          // Verificar se há parâmetro na URL indicando que queremos ver dados de demonstração
          const urlParams = new URLSearchParams(window.location.search);
          const demoMode = urlParams.get('demo') === 'true';
          
          if (demoMode) {
            const today = new Date();
            const demoData = [];
            
            // Gerar dados de saldo bancário dos últimos 30 dias
            for (let i = 30; i >= 0; i--) {
              const date = new Date();
              date.setDate(today.getDate() - i);
              
              // Saldo com algumas flutuações para simular atividade real
              const baseBalance = 5000; // Saldo base
              const randomVariation = Math.sin(i / 3) * 800; // Variação senoidal
              const dailyTrend = i * 30; // Tendência geral de crescimento
              
              demoData.push({
                date: date.toISOString().split('T')[0],
                balance: baseBalance + randomVariation + dailyTrend
              });
            }
            
            jsonData.bank_balance_trend = demoData;
          }
        }
        
        setData(jsonData);
        setError(null);

        // Processar transações
        const expensesData = jsonData.expenses ? jsonData.expenses.map(item => ({
          id: item.id || `expense-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.expense_date || item.date),
          description: item.description,
          amount: item.amount,
          type: 'expense',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          subcategory: item.Subcategory?.subcategory_name || 'Sem subcategoria',
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
          subcategory: item.Subcategory?.subcategory_name || 'Sem subcategoria',
          bank: item.Bank?.name || 'Sem banco',
          is_recurring: item.is_recurring,
          recurrence_id: item.recurrence_id
        })) : [];
        
        console.log("Total expenses found:", expensesData.length);
        console.log("Total incomes found:", incomesData.length);
        
        setTransactions([...expensesData, ...incomesData]);

        if (!jsonData.expenses_by_category || jsonData.expenses_by_category.length === 0) {
          setNoExpensesMessage({
            message: 'Você ainda não tem despesas cadastradas para este período.',
            suggestion: 'Que tal começar adicionando sua primeira despesa?'
          });
        } else {
          setNoExpensesMessage(null);
        }
      } catch (err) {
        setError('Erro ao carregar dados do dashboard');
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, navigate, filters]);
  
  // Novo useEffect para buscar todas as transações independente dos filtros
  useEffect(() => {
    if (!auth.token) return;

    const fetchAllTransactions = async () => {
      try {
        // Usar a nova rota que busca todas as transações
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/dashboard/all-transactions`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Erro ao carregar todas as transações');
        }
        
        const jsonData = await response.json();
        
        // Processar transações de despesas
        const expensesData = jsonData.expenses ? jsonData.expenses.map(item => ({
          id: item.id || `expense-${Math.random().toString(36).substr(2, 9)}`,
          date: new Date(item.expense_date || item.date),
          description: item.description,
          amount: item.amount,
          type: 'expense',
          category: item.Category?.category_name || 'Sem categoria',
          categoryId: item.Category?.id,
          subcategory: item.SubCategory?.subcategory_name || 'Sem subcategoria',
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
          subcategory: item.SubCategory?.subcategory_name || 'Sem subcategoria',
          bank: item.Bank?.name || 'Sem banco'
        })) : [];
        
        console.log("Total de despesas encontradas:", expensesData.length);
        console.log("Total de receitas encontradas:", incomesData.length);
        
        setAllExpenses(expensesData);
        setAllIncomes(incomesData);
      } catch (err) {
        console.error('Erro ao buscar todas as transações:', err);
      }
    };

    fetchAllTransactions();
  }, [auth.token]);

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
          <h3>{title} - {formatPeriod()}</h3>
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
              onClick={() => navigate('/settings')}
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
          message: "Você está economizando acima do necessário. Continue assim!"
        };
      } else if (goal.monthly_balance > 0) {
        const percentOfNeeded = (goal.monthly_balance / goal.monthly_needed * 100).toFixed(0);
        return {
          status: "warning",
          message: `Você está economizando apenas ${percentOfNeeded}% do necessário para atingir seu objetivo no prazo.`
        };
      } else {
        return {
          status: "bad",
          message: "Você não está conseguindo economizar. Revise seu orçamento."
        };
      }
    };
    
    const savingsPace = calculateSavingsPace();

    return (
      <div className={`${styles.chartContainer} ${styles.enhancedGoalCard}`}>
        <div className={styles.goalHeader}>
          <div className={styles.goalTitleSection}>
            <h3>Objetivo: {goal.name}</h3>
            <div className={styles.goalAmount}>
              <span>Meta:</span>
              <strong>{formatCurrency(goal.amount)}</strong>
            </div>
          </div>
          <div className={styles.goalTargetDate}>
            <span>Data alvo:</span>
            <strong>{new Date(goal.end_date).toLocaleDateString('pt-BR')}</strong>
            <div className={styles.goalTimeRemaining}>{timeRemaining}</div>
          </div>
        </div>

        <div className={styles.goalProgressVisual}>
          <div className={styles.goalProgressBar}>
            <div 
              className={`${styles.goalProgressFill} ${!goal.is_achievable ? styles.goalProgressWarning : ''}`}
              style={{ width: `${Math.min(percentageSaved, 100)}%` }}
            ></div>
            <div className={styles.goalProgressLabel}>
              {percentageSaved}% <span>economizado</span>
          </div>
          </div>
          </div>

        <div className={styles.goalStatsGrid}>
          <div className={styles.goalStat}>
            <div className={styles.goalStatLabel}>Economizado</div>
            <div className={`${styles.goalStatValue} ${styles.positive}`}>{formatCurrency(goal.total_saved)}</div>
          </div>
          <div className={styles.goalStat}>
            <div className={styles.goalStatLabel}>Faltando</div>
            <div className={styles.goalStatValue}>{formatCurrency(goal.amount - goal.total_saved)}</div>
          </div>
          <div className={styles.goalStat}>
            <div className={styles.goalStatLabel}>
              Economia Mensal Atual
              <span className={styles.infoTooltip} title="Valor economizado no mês atual ou média histórica se não houver dados suficientes">ℹ️</span>
            </div>
            <div className={`${styles.goalStatValue} ${goal.monthly_balance >= goal.monthly_needed ? styles.positive : styles.negative}`}>
              {formatCurrency(goal.monthly_balance)}
              {goal.current_month_balance !== undefined && (
                <div className={styles.balanceSource}>
                  {Math.abs(goal.current_month_balance) > 0 
                    ? "mês atual" 
                    : "média histórica"}
            </div>
          )}
            </div>
          </div>
          <div className={styles.goalStat}>
            <div className={styles.goalStatLabel}>Necessário por Mês</div>
            <div className={styles.goalStatValue}>{formatCurrency(goal.monthly_needed)}</div>
          </div>
        </div>

        <div className={`${styles.goalPaceIndicator} ${styles[`pace-${savingsPace.status}`]}`}>
          <span className={styles.paceIcon}>
            {savingsPace.status === "good" ? "🚀" : savingsPace.status === "warning" ? "⚠️" : "❌"}
          </span>
          <span className={styles.paceMessage}>{savingsPace.message}</span>
          </div>

        <div style={{ width: '100%', height: '200px' }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              layout="vertical"
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                tick={{ fill: 'var(--text-color)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'var(--text-color)' }}
              />
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
                formatter={(value) => {
                  switch (value) {
                    case 'economia':
                      return <span style={{ color: 'var(--text-color)' }}>Já Economizado</span>;
                    case 'projecao':
                      return <span style={{ color: 'var(--text-color)' }}>Projeção Futura</span>;
                    case 'faltante':
                      return <span style={{ color: 'var(--text-color)' }}>Faltante</span>;
                    default:
                      return <span style={{ color: 'var(--text-color)' }}>{value}</span>;
                  }
                }}
              />
              <Bar dataKey="economia" stackId="a" fill="var(--success-color)" />
              <Bar dataKey="projecao" stackId="a" fill="#2196F3" />
              <Bar dataKey="faltante" stackId="a" fill="var(--error-color)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!goal.is_achievable && (
          <div className={styles.goalAlert}>
            <div className={styles.goalAlertHeader}>
              <span className={styles.alertIcon}>⚠️</span>
              <span className={styles.alertTitle}>Atenção!</span>
            </div>
            <p className={styles.alertMessage}>
              No ritmo atual de economia de {formatCurrency(goal.monthly_balance)} por mês 
              {goal.current_month_balance !== undefined && Math.abs(goal.current_month_balance) > 0 
                ? " (baseado no mês atual)" 
                : " (baseado na média histórica)"}, 
              você precisará de <strong>{goal.months_needed_with_current_savings} meses</strong> para atingir seu objetivo,
              {goal.months_needed_with_current_savings > goal.months_remaining 
                ? ` ou seja, ${goal.months_needed_with_current_savings - goal.months_remaining} meses além do prazo definido.`
                : ' mas ainda está dentro do prazo definido.'}
            </p>
            <div className={styles.alertActions}>
              <button className={styles.actionButton} onClick={() => navigate('/expenses')}>
                Revisar Despesas
              </button>
              <button className={styles.actionButton} onClick={() => navigate('/budget')}>
                Ajustar Orçamento
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBudgetChart = () => {
    if (!data?.budget_info) return null;
    
    const { total_budget, total_spent, daily_budget, days_in_month, days_passed, projected_spend } = data.budget_info;
    
    const remainingBudget = Math.max(0, total_budget - total_spent);
    const spentPercentage = total_budget > 0 ? (total_spent / total_budget) * 100 : 0;
    const daysRemaining = days_in_month - days_passed;
    
    const idealSpentPercentage = (days_passed / days_in_month) * 100;
    const isOverBudget = total_spent > total_budget;
    const isAheadOfBudget = spentPercentage > idealSpentPercentage + 5;
    const isBehindBudget = spentPercentage < idealSpentPercentage - 15;
    
    let statusColor = '';
    let advice = '';
    let statusIcon = '✅';
    
    if (isOverBudget) {
      statusColor = 'dangerProgress';
      advice = 'Você já ultrapassou seu orçamento mensal. Considere revisar seus gastos.';
      statusIcon = '⚠️';
    } else if (isAheadOfBudget) {
      statusColor = 'warningProgress';
      advice = 'Seus gastos estão acima do esperado para este período do mês. Tente reduzir gastos não essenciais.';
      statusIcon = '⚠️';
    } else if (isBehindBudget) {
      statusColor = 'successProgress';
      advice = 'Parabéns! Você está gastando menos do que o planejado. Continue assim!';
      statusIcon = '✅';
    } else {
      statusColor = 'normalProgress';
      advice = 'Seus gastos estão alinhados com seu orçamento. Continue monitorando.';
      statusIcon = '✅';
    }
    
    // Para o caso de orçamento destacado, não mostramos o título duplicado
    const isHighlighted = document.querySelector(`.${styles.highlightedChart}`) !== null;
    
    return (
      <div className={`${styles.budgetInfoContainer} ${styles.chartContainer}`}>
        <div className={styles.chartHeader}>
          <h3>Orçamento Mensal</h3>
        </div>
        
        <div className={styles.budgetStatsContainer}>
          <div className={styles.budgetStats}>
            <div className={styles.budgetStat}>
              <span>Orçamento Total</span>
              <strong>{formatCurrency(total_budget)}</strong>
            </div>
            <div className={styles.budgetStat}>
              <span>Gasto até agora</span>
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
              <span>Gasto diário ideal</span>
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
            onClick={() => navigate('/budget')}
          >
            Ajustar Orçamento
          </button>
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

  const renderIncomeVsExpensesChart = () => {
    if (!data?.budget_info) return null;

    return renderChart('income-vs-expenses', 'Ganhos vs Despesas',
                  <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={[
                        {
                          name: 'Disponível',
                          value: Math.max(0, data.budget_info.total_budget - data.budget_info.total_spent)
                        },
                        {
                          name: 'Total Gasto',
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
                    />
                  </PieChart>
    );
  };

  const renderExpensesByCategoryChart = () => {
    if (!data || !data.expenses_by_category || data.expenses_by_category.length === 0) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Gastos por Categoria</h3>
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
          <h3>Gastos por Categoria</h3>
        </div>
        <div className={styles.categoriesPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoriesData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                labelLine={true}
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                label={({name, percent}) => name && percent ? `${name}: ${(percent * 100).toFixed(1)}%` : ''}
              >
                {categoriesData.map((entry, index) => (
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
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.categoriesInsights}>
          <h4>Categoria principal: {categoriesData[0]?.name || 'Nenhuma'}</h4>
          <p>
            Representa {categoriesData[0]?.value ? ((categoriesData[0].value / totalExpenses) * 100).toFixed(1) : 0}% dos seus gastos.
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

    // Aplicar filtros nas transações já processadas
    const filteredData = transactions.filter(item => {
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
        
        if (diffDays < 7) {
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
            
            <div className={styles.groupingToggle}>
              <span>Agrupar por data</span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={groupByDate}
                  onChange={() => setGroupByDate(!groupByDate)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
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
                            {item.subcategory !== 'Sem subcategoria' && (
                              <>
                                <span className={styles.metaSeparator}>•</span>
                                <span className={styles.timelineItemSubcategory}>{item.subcategory}</span>
                              </>
                            )}
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
                              <span className={styles.detailLabel}>Subcategoria:</span>
                              <span className={styles.detailValue}>{item.subcategory}</span>
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
                              Editar
                            </button>
                            <button 
                              className={styles.detailActionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Implementar visualização de detalhes
                              }}
                            >
                              Ver detalhes
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
                      {item.subcategory !== 'Sem subcategoria' && (
                        <>
                          <span className={styles.metaSeparator}>•</span>
                          <span className={styles.timelineItemSubcategory}>{item.subcategory}</span>
                        </>
                      )}
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
                        <span className={styles.detailLabel}>Subcategoria:</span>
                        <span className={styles.detailValue}>{item.subcategory}</span>
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
                        Editar
                      </button>
                      <button 
                        className={styles.detailActionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Implementar visualização de detalhes
                        }}
                      >
                        Ver detalhes
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
        
        // Filter transactions based on period
        const filteredTransactions = transactions.filter(transaction => {
          if (transaction.type !== 'expense') return false;
          
          const transactionDate = new Date(transaction.date);
          const now = new Date();
          
          if (selectedPeriod === 'month') {
            return transactionDate.getMonth() === now.getMonth() && 
                  transactionDate.getFullYear() === now.getFullYear();
          } else if (selectedPeriod === 'year') {
            return transactionDate.getFullYear() === now.getFullYear();
          } else {
            return true; // 'all' option
          }
        });
        
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
  }, [transactions, selectedPeriod]);
  
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
        
        // Filter transactions based on period
        const filteredTransactions = transactions.filter(transaction => {
          if (transaction.type !== 'income') return false;
          
          const transactionDate = new Date(transaction.date);
          const now = new Date();
          
          if (selectedPeriod === 'month') {
            return transactionDate.getMonth() === now.getMonth() && 
                  transactionDate.getFullYear() === now.getFullYear();
          } else if (selectedPeriod === 'year') {
            return transactionDate.getFullYear() === now.getFullYear();
          } else {
            return true; // 'all' option
          }
        });
        
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
  }, [transactions, selectedPeriod]);
  
  const renderCategoriesChart = () => {
    const handlePeriodChange = (period) => {
      setSelectedPeriod(period);
    };
    
    console.log("Rendering category chart, data:", categoryData);
    
    if (categoriesLoading) {
      return (
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h3>Gastos por Categoria</h3>
            <div className={styles.controlGroup}>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Mês
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                Ano
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
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
            <h3>Gastos por Categoria</h3>
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
            <h3>Gastos por Categoria</h3>
            <div className={styles.controlGroup}>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Mês
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                Ano
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
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
          <h3>Gastos por Categoria</h3>
          <div className={styles.controlGroup}>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              Mês
            </button>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('year')}
            >
              Ano
            </button>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
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
            Representa {categoryData[0]?.percentage ? categoryData[0].percentage.toFixed(1) : 0}% dos seus gastos
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
            <h3>Fontes de Renda</h3>
            <div className={styles.controlGroup}>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Mês
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                Ano
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
                Todos
              </button>
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
            <h3>Fontes de Renda</h3>
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
            <h3>Fontes de Renda</h3>
            <div className={styles.controlGroup}>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('month')}
              >
                Mês
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('year')}
              >
                Ano
              </button>
              <button 
                className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
                onClick={() => handlePeriodChange('all')}
              >
                Todos
              </button>
            </div>
          </div>
          <div className={styles.emptyState}>
            Nenhuma renda encontrada{selectedPeriod === 'month' ? ' neste mês' : 
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
          <h3>Fontes de Renda</h3>
          <div className={styles.controlGroup}>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'month' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('month')}
            >
              Mês
            </button>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'year' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('year')}
            >
              Ano
            </button>
            <button 
              className={`${styles.buttonSelector} ${selectedPeriod === 'all' ? styles.active : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
              Todos
            </button>
          </div>
        </div>

        <div className={styles.categoriesPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={incomeCategoriesWithColors}
                cx="50%"
                cy="50%"
                labelLine={true}
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
          <h3>Gastos por Banco</h3>
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
          <h3>Gastos por Banco</h3>
        </div>
        <div className={styles.bankPieContainer}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bankData}
                cx="50%"
                cy="50%"
                labelLine={true}
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
          description: `${largestExpense.category_name} representa ${((largestExpense.total / totalExpenses) * 100).toFixed(0)}% dos seus gastos.`,
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

  const renderExpensesTrend = () => {
    // Usando todos os dados de despesas, independente dos filtros
    if (!allExpenses?.length) {
      return (
        <div className={styles.emptyChart}>
          <p>Não há dados de despesas para exibir</p>
          </div>
      );
    }

    // Agrupando despesas por mês
    const groupedData = {};
    
    allExpenses.forEach(expense => {
      const date = new Date(expense.date);
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

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Tendência de Despesas</h3>
          <div className={styles.chartSubtitle}>
            Mostrando todos os dados cadastrados, independente dos filtros
          </div>
        </div>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44336" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f44336" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(tick) => {
                  const [year, month] = tick.split('-');
                  return `${months.find(m => m.value === parseInt(month))?.shortLabel || month}/${year.slice(2)}`;
                }}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={value => formatCurrency(value)} />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#f44336" 
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
                name="Despesas"
              />
            </AreaChart>
          </ResponsiveContainer>
            </div>
        </div>
    );
  };

  const renderIncomeTrend = () => {
    // Usando todos os dados de receitas, independente dos filtros
    if (!allIncomes?.length) {
      return (
        <div className={styles.emptyChart}>
          <p>Não há dados de receitas para exibir</p>
      </div>
      );
    }

    // Agrupando receitas por mês
    const groupedData = {};
    
    allIncomes.forEach(income => {
      const date = new Date(income.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = {
          date: monthKey,
          total: 0
        };
      }
      
      groupedData[monthKey].total += parseFloat(income.amount || 0);
    });
    
    // Convertendo para array e ordenando por data
    const chartData = Object.values(groupedData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Tendência de Receitas</h3>
          <div className={styles.chartSubtitle}>
            Mostrando todos os dados cadastrados, independente dos filtros
          </div>
        </div>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncomes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(tick) => {
                  const [year, month] = tick.split('-');
                  return `${months.find(m => m.value === parseInt(month))?.shortLabel || month}/${year.slice(2)}`;
                }}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={value => formatCurrency(value)} />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#4caf50" 
                fillOpacity={1} 
                fill="url(#colorIncomes)" 
                name="Receitas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderOverviewCharts = () => (
    <>
      {/* Exibir o gráfico de orçamento em destaque */}
      <div className={`${styles.chartContainer} ${styles.highlightedChart}`}>
        <div className={styles.budgetHeader}>
          <h3>Resumo de Orçamento</h3>
          <div className={styles.budgetDate}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        {renderBudgetChart()}
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
        
        <div className={styles.chartContainer}>
          {renderFinancialGoalChart()}
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
      <button className={styles.retryButton} onClick={() => setLoading(true)}>
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
        <button onClick={() => navigate('/expenses/add')}>Adicionar Despesa</button>
        <button onClick={() => navigate('/incomes/add')}>Adicionar Receita</button>
        </div>
      </div>
    );

  return (
    <div className={styles.dashboard}>
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

      {/* Conteúdo baseado na seção selecionada */}
      <div className={styles.dashboardContent}>
        {activeSection === 'overview' && (
          <div className={styles.overviewSection}>
            {/* Conteúdo original do dashboard */}
            <div className={styles.dashboardGreeting}>
              <h1>Resumo de Orçamento</h1>
              <p className={styles.motivationalPhrase}>
                Acompanhe suas finanças e planeje seu futuro com tranquilidade
              </p>
            </div>

            <div className={styles.filterRow}>
              <div className={styles.filtersContainer}>
                <div className={styles.modernFilters}>
                  <FilterSelector
                    title="Mês"
                    options={months}
                    selected={filters.months}
                    onChange={(value) => handleFilterChange('months', value)}
                    type="month"
                  />
                  
                  <FilterSelector
                    title="Ano"
                    options={years}
                    selected={filters.years}
                    onChange={(value) => handleFilterChange('years', value)}
                    type="year"
                  />
                </div>
                
                <div className={styles.selectedPeriodSummary}>
                  <div className={styles.periodIndicator}>
                    <span className={styles.periodIcon}>📅</span>
                    <span className={styles.periodText}>{formatPeriod()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.dashboardCharts}>
              {loading ? (
                <div className={styles.dashboardLoading}>
                  <p>Carregando dados...</p>
            </div>
              ) : error ? (
                <div className={styles.dashboardError}>
                  <p>{error}</p>
                </div>
              ) : noExpensesMessage ? (
                <div className={styles.noExpensesMessage}>
                  <div className={styles.messageIcon}>📊</div>
                  <h3>{noExpensesMessage.message}</h3>
                  <p>{noExpensesMessage.suggestion}</p>
                  <Link to="/despesas/nova" className={styles.addExpenseButton}>
                    Adicionar Despesa
                  </Link>
                </div>
              ) : (
                renderOverviewCharts()
              )}
            </div>
          </div>
        )}
        
        {activeSection === 'transactions' && (
          <div className={styles.transactionsSection}>
          {renderTimelineChart()}
          </div>
        )}
      </div>
      
      {/* Footer com botões de ação - visível apenas em mobile */}
      <div className={styles.dashboardFooter}>
        <div className={styles.footerActions}>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/expenses/add')}
          >
            <span className={styles.actionIcon}>+</span>
            <span className={styles.actionText}>Nova Despesa</span>
          </button>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/incomes/add')}
          >
            <span className={styles.actionIcon}>+</span>
            <span className={styles.actionText}>Nova Receita</span>
          </button>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/budget')}
          >
            <span className={styles.actionIcon}>📝</span>
            <span className={styles.actionText}>Orçamento</span>
          </button>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/reports')}
          >
            <span className={styles.actionIcon}>📊</span>
            <span className={styles.actionText}>Relatórios</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;