import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import {  
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
  Cell,
  ComposedChart,
  AreaChart,
  ReferenceLine  
} from 'recharts';
import { FaChartLine, FaChevronDown} from 'react-icons/fa';
import DateRangePicker from '../shared/DateRangePicker';

import { 
  BsPlusLg, 
  BsCash,  
  BsPencil, 
  BsEye,
} from 'react-icons/bs';
import { ResponsiveContainer } from 'recharts';


// Substituição para todas as classes CSS removidas
const styles = {};

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
    <div>
      <div>
      <h2>{greeting}, {userName}!</h2>
        <p>"{randomPhrase}"</p>
      </div>
      <div>
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

  if (loading) return <div>
    <div></div>
    <p>Carregando projeção financeira...</p>
  </div>;
  
  if (error) return <div>
    <span>⚠️</span>
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
    <div>
      {showTitle && (
        <div>
          <h2>Projeção de Saldo</h2>
          <button 
            onClick={() => setShowTips(!showTips)}
            title={showTips ? "Ocultar dicas" : "Mostrar dicas"}
          >
            {showTips ? "🔍" : "💡"}
          </button>
        </div>
      )}
      
      {showTips && (
        <div>
          <p>{insight}</p>
          {trend && (
            <div>
              <span>Tendência: </span>
              {trend.direction === "up" ? (
                <span>↗️ +{trend.percentage}%</span>
              ) : trend.direction === "down" ? (
                <span>↘️ -{trend.percentage}%</span>
              ) : (
                <span>→ Estável</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {showControls && (
        <div>
          <div>
            <span>Projeção para:</span>
            <div>
              <button 
                onClick={() => setProjectionMonths(3)}
              >
                3 meses
              </button>
              <button 
                onClick={() => setProjectionMonths(6)}
              >
                6 meses
              </button>
              <button 
                onClick={() => setProjectionMonths(12)}
              >
                12 meses
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <ComposedChart 
          width={700} 
          height={height} 
          data={data.projectionData}
          margin={{ top: 30, right: 30, left: 0, bottom: 5 }}
          onMouseMove={(e) => {
            if (e && e.activeTooltipIndex) {
              handleMouseEnter(data.projectionData[e.activeTooltipIndex], e.activeTooltipIndex);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--success-color)" stopOpacity={1}/>
              <stop offset="95%" stopColor="var(--success-color)" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--error-color)" stopOpacity={1}/>
              <stop offset="95%" stopColor="var(--error-color)" stopOpacity={1}/>
            </linearGradient>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E90FF" stopOpacity={1}/>
              <stop offset="95%" stopColor="#1E90FF" stopOpacity={1}/>
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
              return <span>{value}</span>;
            }}
          />
          
          <Area
            type="monotone"
            dataKey="receitas"
            stroke="var(--success-color)"
            fillOpacity={1}
            fill="var(--success-color)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            stroke="var(--error-color)"
            fillOpacity={1}
            fill="var(--error-color)"
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
                  onClick={() => handleDotClick(index)}
                  onMouseEnter={() => handleMouseEnter(props.payload, index)}
                />
              );
            }}
            activeDot={{ r: 8, fill: '#1E90FF', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </div>

      <div>
        <div>
          <span>Receitas Projetados </span>
          <strong>
            {formatFullCurrency(data.summary.totalProjectedIncomes)}
          </strong>
        </div>
        <div>
          <span>Despesas Projetadas </span>
          <strong>
            {formatFullCurrency(data.summary.totalProjectedExpenses)}
          </strong>
        </div>
        <div>
          <span>Saldo Final Projetado </span>
          <strong>
            {formatFullCurrency(data.summary.finalBalance)}
          </strong>
        </div>
      </div>
      
      {activeDot !== null && (
        <div>
          <h4>Detalhe do Mês</h4>
          <div>
            {data.projectionData[activeDot] && (
              <>
                <div>
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
                <div>
                  <span>Receitas:</span>
                  <strong>
                    {formatFullCurrency(data.projectionData[activeDot].receitas)}
                  </strong>
                </div>
                <div>
                  <span>Despesas:</span>
                  <strong>
                    {formatFullCurrency(data.projectionData[activeDot].despesas)}
                  </strong>
                </div>
                <div>
                  <span>Saldo:</span>
                  <strong>
                    {formatFullCurrency(data.projectionData[activeDot].saldo)}
                  </strong>
                </div>
                <div>
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
    <div>
      <div>
        <h3>Saúde Financeira</h3>
        <div>
          {healthScore}
          <span>/100</span>
        </div>
      </div>
      
      <div>
        <div></div>
      </div>
      
      <div>
        Status: <span>{healthStatus}</span>
      </div>
      
      <div>
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
    <div ref={filterRef}>
      <div>{label}</div>
      <div 
        onClick={handleToggle}
      >
        <span>{getDisplayText()}</span>
        <FaChevronDown />
      </div>
      {isOpen && (
        <div>
          {multiple && (
            <>
              <div onClick={handleSelectAll}>
                <input 
                  type="checkbox" 
                  checked={selected.length === options.length}
                  onChange={() => {}}
                />
                <span>Selecionar Todos</span>
              </div>
              <div />
            </>
          )}
          <div>
            {options.map(option => (
              <div 
                key={option.value}
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
  const [username, setUsername] = useState(null);
  const [revenueStatsByCategory, setRevenueStatsByCategory] = useState([]);
  const [revenueByCategoryLoading, setRevenueByCategoryLoading] = useState(true);
  const [revenueByCategoryError, setRevenueByCategoryError] = useState(null);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [expensesByCategoryLoading, setExpensesByCategoryLoading] = useState(true);
  const [expensesByCategoryError, setExpensesByCategoryError] = useState(null);

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
        <div>
          <p>{`Data: ${formatDate(label)}`}</p>
          {payload.map((entry, index) => (
            <p key={index}>
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
      <div>
        <div>
          <h3>{title}</h3>
          <div>
            <span>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        {React.cloneElement(chartComponent, {
          width: 800,
          height: 400
        })}
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
        <div>
          <h3>Objetivo Financeiro</h3>
          <div>
            <span>🎯</span>
            <p>Você ainda não definiu um objetivo financeiro.</p>
            <button 
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
      <div>
        <div>
          <div>
            <h3>Objetivo: {goal.name}</h3>
            <div>
              <span>Meta para:</span> {new Date(goal.end_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div>Meta Total</div>
            <div>{formatCurrency(goal.amount)}</div>
          </div>
        </div>
        
        <div>
          <div>
            <div>
              <div>
                <div>{percentageSaved}%</div>
                <div>concluído</div>
              </div>
            </div>
            <div>
              <div>⏱️</div>
              <div>{timeRemaining}</div>
            </div>
          </div>
          
          <div>
            <div>
              <div>
                <span>💰</span> Economizado
              </div>
              <div>{formatCurrency(goal.total_saved)}</div>
            </div>
            <div>
              <div>
                <span>📊</span> Faltando
              </div>
              <div>{formatCurrency(goal.amount - goal.total_saved)}</div>
            </div>
            <div>
              <div>
                <span>💸</span> Economia Mensal
              </div>
              <div>
                {formatCurrency(goal.monthly_balance)}
              </div>
              <div>
                {Math.abs(goal.current_month_balance) > 0 ? "mês atual" : "média histórica"}
              </div>
            </div>
            <div>
              <div>
                <span>🎯</span> Necessário/Mês
              </div>
              <div>{formatCurrency(goal.monthly_needed)}</div>
            </div>
          </div>
        </div>
        
        <div>
          <div>{savingsPace.icon}</div>
          <div>{savingsPace.message}</div>
        </div>
        
        <div>
          <div>
            <h4>Projeção de Conclusão</h4>
            <div>
              <div>
                <div></div>
                <div>Hoje</div>
              </div>
              <div>
                <div></div>
              </div>
              <div>
                <div></div>
                <div>
                  {formattedCompletionDate}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <BarChart
              width={400}
              height={100}
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
                formatter={value => formatCurrency(value)} 
                labelFormatter={(label) => formatDateLabel(label, chartData)}
                contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
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
                  return <span>{value}</span>;
                }}
              />
              <Bar dataKey="economia" stackId="a" fill="var(--success-color)" name="Economizado" />
              <Bar dataKey="projecao" stackId="a" fill="#2196F3" name="Projeção Futura" />
              <Bar dataKey="faltante" stackId="a" fill="var(--error-color)" name="Faltante" />
            </BarChart>
            
            <div>
              <div>
                <div></div>
                <div>Economizado</div>
              </div>
              <div>
                <div></div>
                <div>Projeção Futura</div>
              </div>
              <div>
                <div></div>
                <div>Faltante</div>
              </div>
            </div>
          </div>
        </div>
        
        {!goal.is_achievable && (
          <div>
            <div>
              <span>⚠️</span> Objetivo em risco
            </div>
            <div>
              Com seu ritmo atual de economia, esta meta não será atingida no prazo estabelecido. 
              Considere aumentar o valor mensal economizado ou ajustar a data de conclusão da meta.
            </div>
            <div>
              <button onClick={() => navigate('/expenses')}>
                <span>📊</span> Revisar Despesas
              </button>
              <button onClick={() => navigate('/profile')}>
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
        <div>
          <div>💰</div>
          <p>Você ainda não tem um orçamento definido para este período.</p>
          <button 
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
      advice = 'Você ultrapassou seu orçamento! Evite novas despesas até o próximo mês.';
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
      <div>
        <div>
          <h3>Resumo do Orçamento</h3>
          <div>
            {formatCurrentDateFilter()}
          </div>
        </div>
        
        <div>
          <div>
            <div>
              <span>Orçamento Total</span>
              <strong>{formatCurrency(total_budget)}</strong>
            </div>
            <div>
              <span>Despesa até agora</span>
              <strong>{formatCurrency(total_spent)}</strong>
            </div>
            <div>
              <span>Disponível</span>
              <strong>{formatCurrency(remainingBudget)}</strong>
            </div>
          </div>
          
          <div>
            <div>
              <span>Progresso do orçamento</span>
              <span>{spentPercentage.toFixed(1)}%</span>
            </div>
            <div>
              <div></div>
              <div></div>
            </div>
          </div>
          
          <div>
            <div>
              <span>Dias restantes</span>
              <strong>{daysRemaining}</strong>
            </div>
            <div>
              <span>Despesa diário ideal</span>
              <strong>{formatCurrency(remainingBudget / (daysRemaining || 1))}</strong>
            </div>
          </div>
        </div>
        
        <div>
          <div>
            <span>{statusIcon}</span>
            <p>{advice}</p>
          </div>
        </div>
        
        <div>
          <button
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
      <div>
        <div>
          <h3>Receitas vs Despesas</h3>
          <div>
            <span>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        <PieChart 
          width={isMobile ? 300 : 500} 
          height={isMobile ? 220 : 280} 
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <defs>
            <filter id="income-vs-expense-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={isMobile ? 80 : 100}
            innerRadius={0}
            startAngle={90}
            endAngle={-270}
            filter="url(#income-vs-expense-shadow)"
            animationDuration={800}
            animationBegin={200}
            animationEasing="ease-out"
            label={incomePieLabel}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                stroke="#ffffff" 
                strokeWidth={2} 
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(value)}
          />
          <Legend
            layout={isMobile ? "horizontal" : "vertical"}
            align="center"
            verticalAlign="bottom"
            iconType="circle"
            iconSize={isMobile ? 8 : 10}
            formatter={(value, entry) => (
              <span>
                {value}{isMobile ? '' : `: ${formatCurrency(entry.payload.value)}`} ({(entry.payload.percent * 100).toFixed(0)}%)
              </span>
            )}
          />
        </PieChart>
        
        <div>
          <div>
            <span>Receitas totais:</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <div>
            <span>Despesas totais:</span>
            <strong>{formatCurrency(totalSpent)}</strong>
          </div>
          <div>
            <span>Saldo disponível:</span>
            <strong>{formatCurrency(available)}</strong>
          </div>
        </div>
      </div>
    );
  };

  // Improved renderExpensesByCategoryChart with better visualization and mobile optimization
  const renderExpensesByCategoryChart = () => {
    if (!data || !data.expenses_by_category || data.expenses_by_category.length === 0) {
      return (
        <div>
          <div>
            <h3>Despesas por Categoria</h3>
            <div>
              <span>
                <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
              </span>
            </div>
          </div>
          <div>
            <span>📊</span>
            <p>Não há despesas no período selecionado.</p>
          </div>
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
      <div>
        <div>
          <h3>Despesas por Categoria</h3>
          <div>
            <span>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        <PieChart 
          width={isMobile ? 300 : 500} 
          height={isMobile ? 220 : 280} 
          margin={{ top: 10, right: isMobile ? 10 : 60, left: 10, bottom: 10 }}
        >
          <defs>
            {categoriesData.map((entry, index) => (
              <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.3" />
              </filter>
            ))}
          </defs>
          <Pie
            data={categoriesData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={isMobile ? 70 : 130}
            innerRadius={isMobile ? 30 : 60}
            paddingAngle={2}
            fill="#8884d8"
            dataKey="value"
            nameKey="category"
            label={getCustomizedPieLabel}
            filter="url(#shadow)"
            animationDuration={800}
            animationBegin={200}
            animationEasing="ease-out"
          >
            {categoriesData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                stroke="#ffffff" 
                strokeWidth={1} 
                filter={`url(#shadow-${index})`} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
          <Legend 
            layout={isMobile ? "horizontal" : "vertical"}
            align={isMobile ? "center" : "right"}
            verticalAlign={isMobile ? "bottom" : "middle"}
            iconType="circle"
            iconSize={isMobile ? 8 : 10}
            formatter={(value, entry) => (
              <span>
                {isMobile ? value.substring(0, 10) + (value.length > 10 ? '...' : '') : value} 
                {!isMobile && ` (${(entry.payload.percent * 100).toFixed(1)}%)`}
              </span>
            )}
          />
        </PieChart>
        
        <div>
          <h4>Categoria principal: {categoriesData[0]?.name || 'Nenhuma'}</h4>
          <p>
            Representa {categoriesData[0]?.percent ? (categoriesData[0].percent * 100).toFixed(1) : 0}% dos seus despesas.
          </p>
          <div>
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
        <div>
          <div>
            <h3>Linha do Tempo de Transações</h3>
          </div>
          <div>
            <div>💰</div>
            <p>Ainda não existem transações registradas.</p>
            <div>
              <button 
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
      <div>
        <div>
          <h3>Linha do Tempo de Transações</h3>
          
          <div>
            <div>
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              )}
            </div>
            
            <div>
              <button
                onClick={() => setTimelineFilter('all')}
              >
                Todos
              </button>
              <button
                onClick={() => setTimelineFilter('income')}
              >
                Receitas
              </button>
              <button
                onClick={() => setTimelineFilter('expense')}
              >
                Despesas
              </button>
            </div>
          </div>
        </div>
        
        {filteredData.length === 0 ? (
          <div>
            <div>💸</div>
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
          <div>
            {groupedArray.map(group => (
              <div key={group.date.toISOString()}>
                <div>
                  <div>
                    <span>{getRelativeDate(group.date)}</span>
                    <span>{formatDate(group.date)}</span>
                  </div>
                  
                  {hasDailyTotal(group.items) && (
                    <div>
                      <div>
                        <span>Receitas:</span>
                        <span>
                          {formatCurrency(calculateDailyTotal(group.items).income)}
                        </span>
                      </div>
                      <div>
                        <span>Despesas:</span>
                        <span>
                          {formatCurrency(calculateDailyTotal(group.items).expense)}
                        </span>
                      </div>
                      <div>
                        <span>Saldo:</span>
                        <span>
                          {formatCurrency(calculateDailyTotal(group.items).balance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  {group.items.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div>
                        <div>
                          {item.type === 'income' ? '💰' : '💸'}
                        </div>
                        <div>
                          <div>
                            {item.description}
                            {item.is_recurring && (
                              <span>Recorrente</span>
                            )}
                          </div>
                          <div>
                            <span>{item.category}</span>
                            {item.bank !== 'Sem banco' && (
                              <>
                                <span>•</span>
                                <span>{item.bank}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <span>
                            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div>
                          {expandedItems.includes(item.id) ? '▼' : '▶'}
                        </div>
                      </div>
                      
                      {expandedItems.includes(item.id) && (
                        <div>
                          <div>
                            <div>
                              <span>Tipo:</span>
                              <span>
                                {item.type === 'income' ? 'Receita' : 'Despesa'}
                              </span>
                            </div>
                            <div>
                              <span>Data:</span>
                              <span>{formatDate(item.date)}</span>
                            </div>
                            <div>
                              <span>Categoria:</span>
                              <span>{item.category}</span>
                            </div>
                            <div>
                              <span>Banco:</span>
                              <span>{item.bank}</span>
                            </div>
                            <div>
                              <span>Recorrente:</span>
                              <span>{item.is_recurring ? 'Sim' : 'Não'}</span>
                            </div>
                          </div>
                          
                          <div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/${item.type === 'income' ? 'incomes' : 'expenses'}/edit/${item.id}`);
                              }}
                            >
                              <BsPencil size={16} /> Editar
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Implementar visualização de detalhes
                              }}
                            >
                              <BsEye size={16} /> Ver detalhes
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
          <div>
            {filteredData.map(item => (
              <div 
                key={item.id}
                onClick={() => toggleExpand(item.id)}
              >
                <div>
                  <div>
                    <span>{getRelativeDate(item.date)}</span>
                    <span>{formatDate(item.date)}</span>
                  </div>
                  <div>
                    {item.type === 'income' ? '💰' : '💸'}
                  </div>
                  <div>
                    <div>
                      {item.description}
                      {item.is_recurring && (
                        <span>Recorrente</span>
                      )}
                    </div>
                    <div>
                      <span>{item.category}</span>
                      {item.bank !== 'Sem banco' && (
                        <>
                          <span>•</span>
                          <span>{item.bank}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span>
                      {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div>
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
    
    // Obtendo a data atual e a data limite de 5 anos no futuro
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(currentDate.getFullYear() + 5);
    
    allExpenses.forEach(expense => {
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
          <h3>Tendência de Despesas</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart 
            data={chartData} 
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(tick) => {
                const date = new Date(tick);
                const month = date.getMonth() + 1;
                const monthName = months.find(m => m.value === month)?.shortLabel || month;
                const year = date.getFullYear().toString().slice(2);
                return `${monthName}/${year}`;
              }}
              angle={-30}
              textAnchor="end"
              height={60}
              interval={isMobile ? 1 : "preserveStartEnd"}
              tickMargin={10}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              tickFormatter={(tick) => `R$${(tick/1000).toFixed(1)}k`} 
              width={65}
              tickMargin={5}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Despesa']} 
              labelFormatter={(label) => formatDateLabel(label, chartData)}
              contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#FF6B6B" 
              fillOpacity={1} 
              fill="url(#colorExpense)" 
              name="Despesas"
              strokeWidth={2}
              activeDot={{ r: 6, strokeWidth: 2 }}
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
    );
  };

  const renderIncomeTrend = () => {
    // Verificar se existem receitas para mostrar
    if (!allIncomes?.length) {
      return (
        <div className={styles.emptyChart}>
          <p>Não há dados de receitas para exibir</p>
        </div>
      );
    }

    // Agrupando receitas por mês
    const groupedData = {};
    
    // Obtendo a data atual e a data limite de 5 anos no futuro
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(currentDate.getFullYear() + 5);
    
    allIncomes.forEach(income => {
      const date = new Date(income.date);
      
      // Ignorar datas que estão além dos próximos 5 anos
      if (date > futureDate) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groupedData[monthKey]) {
        groupedData[monthKey] = {
          date: monthKey,
          value: 0
        };
      }
      
      groupedData[monthKey].value += parseFloat(income.amount || 0);
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
    const avgIncome = recentMonths.length > 0 
      ? recentMonths.reduce((sum, item) => sum + item.value, 0) / recentMonths.length 
      : 0;
    
    // Adicionar projeção para completar 5 anos a partir de hoje
    while (projectionDate < futureDate) {
      projectionDate.setMonth(projectionDate.getMonth() + 1);
      
      // Pular se já existe um dado para este mês (evitar duplicações)
      const projMonthKey = `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`;
      if (groupedData[projMonthKey]) continue;
      
      chartData.push({
        date: projMonthKey,
        value: avgIncome,
        isProjection: true
      });
    }

    // Ordenando novamente após adicionar projeções
    chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Tendência de Receitas</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart 
            data={chartData} 
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
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
                const date = new Date(tick);
                const month = date.getMonth() + 1;
                const monthName = months.find(m => m.value === month)?.shortLabel || month;
                const year = date.getFullYear().toString().slice(2);
                return `${monthName}/${year}`;
              }}
              angle={-30}
              textAnchor="end"
              height={60}
              interval={isMobile ? 1 : "preserveStartEnd"}
              tickMargin={10}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              tickFormatter={formatCurrency} 
              width={65}
              tickMargin={5}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <Tooltip 
              formatter={(value) => [formatCurrency(value), 'Receita']} 
              labelFormatter={(label) => formatDateLabel(label, chartData)}
              contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#2196F3" 
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              name="Receitas"
              strokeWidth={2}
              activeDot={{ r: 6, strokeWidth: 2 }}
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
    );
  };

  const renderMonthlyComparisonChart = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Carregando comparativo mensal...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <p>Erro ao carregar o comparativo mensal: {error}</p>
        </div>
      );
    }

    if (!data || !data.monthly_comparison || data.monthly_comparison.length === 0) {
      return (
        <div className={styles.emptyChartContainer}>
          <div className={styles.emptyChartContent}>
            <i className={`fas fa-chart-bar ${styles.emptyChartIcon}`}></i>
            <p>Sem dados suficientes para exibir o comparativo mensal.</p>
            <p>Adicione receitas e despesas para visualizar este gráfico.</p>
          </div>
        </div>
      );
    }

    // Formatar os dados para o gráfico
    const chartData = data.monthly_comparison.map(item => ({
      name: `${months.find(m => m.value === parseInt(item.month))?.shortLabel || item.month}/${item.year.toString().slice(2)}`,
      receitas: item.income,
      despesas: item.expenses,
      saldo: item.income - item.expenses,
      month: item.month,
      year: item.year,
      monthName: months.find(m => m.value === parseInt(item.month))?.label || `Mês ${item.month}`
    }));

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Comparativo Mensal</h3>
          <div className={styles.chartSubtitle}>
            <span className={styles.dateFilterBadge}>
              <i className="far fa-calendar-alt"></i> {formatCurrentDateFilter()}
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            layout="horizontal"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              angle={-30} 
              textAnchor="end" 
              height={60} 
              interval={isMobile ? 1 : "preserveStartEnd"} 
              tickMargin={10}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              yAxisId="left"
              tickFormatter={formatCurrency} 
              width={65}
              tickMargin={5}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              yAxisId="right"
              tickFormatter={formatCurrency} 
              orientation="right"
              width={65}
              tickMargin={5}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <Tooltip 
              formatter={(value, name) => {
                return [formatCurrency(value), name];
              }} 
              contentStyle={{ 
                background: 'var(--card-background)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                color: 'var(--text-color)' 
              }} 
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '10px', 
                fontSize: isMobile ? '10px' : '12px',
                width: '100%'
              }} 
            />
            <Bar 
              yAxisId="left"
              dataKey="receitas" 
              fill="var(--success-color)" 
              name="Receitas" 
              radius={[4, 4, 0, 0]} 
              barSize={isMobile ? 15 : 30} 
            />
            <Bar 
              yAxisId="left"
              dataKey="despesas" 
              fill="var(--error-color)" 
              name="Despesas" 
              radius={[4, 4, 0, 0]} 
              barSize={isMobile ? 15 : 30} 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="saldo" 
              stroke="var(--primary-color)" 
              strokeWidth={2} 
              name="Saldo" 
              dot={{ r: 4 }} 
              activeDot={{ r: 6 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {renderMonthlyComparisonInsights(chartData)}
      </div>
    );
  };
  
  const renderMonthlyComparisonInsights = (chartData) => {
    if (!chartData || chartData.length === 0) return null;
    
    // Encontrar mês com maior receita
    const maxIncome = chartData.reduce((max, item) => 
      item.receitas > max.value ? { value: item.receitas, month: item.monthName, year: item.year } : max, 
      { value: 0, month: '', year: 0 }
    );
    
    // Encontrar mês com maior despesa
    const maxExpense = chartData.reduce((max, item) => 
      item.despesas > max.value ? { value: item.despesas, month: item.monthName, year: item.year } : max, 
      { value: 0, month: '', year: 0 }
    );
    
    // Encontrar mês com melhor saldo
    const bestBalance = chartData.reduce((max, item) => 
      item.saldo > max.value ? { value: item.saldo, month: item.monthName, year: item.year } : max, 
      { value: -Infinity, month: '', year: 0 }
    );
    
    // Encontrar mês com pior saldo
    const worstBalance = chartData.reduce((min, item) => 
      item.saldo < min.value ? { value: item.saldo, month: item.monthName, year: item.year } : min, 
      { value: Infinity, month: '', year: 0 }
    );
    
    // Calcular médias
    const avgIncome = chartData.reduce((sum, item) => sum + item.receitas, 0) / chartData.length;
    const avgExpense = chartData.reduce((sum, item) => sum + item.despesas, 0) / chartData.length;
    
    // Verificar tendência dos últimos 3 meses (se disponível)
    let incomeTrend = null;
    let expenseTrend = null;
    let balanceTrend = null;
    
    if (chartData.length >= 3) {
      const last3Months = chartData.slice(-3);
      
      // Tendência de receitas
      if (last3Months[2].receitas > last3Months[1].receitas && last3Months[1].receitas > last3Months[0].receitas) {
        incomeTrend = { trend: 'up', message: 'Suas receitas estão crescendo nos últimos 3 meses' };
      } else if (last3Months[2].receitas < last3Months[1].receitas && last3Months[1].receitas < last3Months[0].receitas) {
        incomeTrend = { trend: 'down', message: 'Suas receitas estão diminuindo nos últimos 3 meses' };
      }
      
      // Tendência de despesas
      if (last3Months[2].despesas > last3Months[1].despesas && last3Months[1].despesas > last3Months[0].despesas) {
        expenseTrend = { trend: 'up', message: 'Suas despesas estão aumentando nos últimos 3 meses' };
      } else if (last3Months[2].despesas < last3Months[1].despesas && last3Months[1].despesas < last3Months[0].despesas) {
        expenseTrend = { trend: 'down', message: 'Suas despesas estão diminuindo nos últimos 3 meses' };
      }
      
      // Tendência de saldo
      if (last3Months[2].saldo > last3Months[1].saldo && last3Months[1].saldo > last3Months[0].saldo) {
        balanceTrend = { trend: 'up', message: 'Seu saldo está melhorando nos últimos 3 meses' };
      } else if (last3Months[2].saldo < last3Months[1].saldo && last3Months[1].saldo < last3Months[0].saldo) {
        balanceTrend = { trend: 'down', message: 'Seu saldo está piorando nos últimos 3 meses' };
      }
    }
    
    return (
      <div className={styles.insightsContainer}>
        <h4>Insights do Comparativo Mensal</h4>
        <div className={styles.insightsGrid}>
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>📈</div>
            <div className={styles.insightContent}>
              <h5>Maior Receita</h5>
              <p>{maxIncome.month} de {maxIncome.year}: {formatCurrency(maxIncome.value)}</p>
            </div>
          </div>
          
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>📉</div>
            <div className={styles.insightContent}>
              <h5>Maior Despesa</h5>
              <p>{maxExpense.month} de {maxExpense.year}: {formatCurrency(maxExpense.value)}</p>
            </div>
          </div>
          
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>🏆</div>
            <div className={styles.insightContent}>
              <h5>Melhor Saldo</h5>
              <p>{bestBalance.month} de {bestBalance.year}: {formatCurrency(bestBalance.value)}</p>
            </div>
          </div>
          
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>⚠️</div>
            <div className={styles.insightContent}>
              <h5>Pior Saldo</h5>
              <p>{worstBalance.month} de {worstBalance.year}: {formatCurrency(worstBalance.value)}</p>
            </div>
          </div>
          
          <div className={styles.insightItem}>
            <div className={styles.insightIcon}>💰</div>
            <div className={styles.insightContent}>
              <h5>Médias</h5>
              <p>Receita: {formatCurrency(avgIncome)} | Despesa: {formatCurrency(avgExpense)}</p>
            </div>
          </div>
          
          {(incomeTrend || expenseTrend || balanceTrend) && (
            <div className={styles.insightItem}>
              <div className={styles.insightIcon}>📊</div>
              <div className={styles.insightContent}>
                <h5>Tendências (últimos 3 meses)</h5>
                {incomeTrend && (
                  <p>
                    <span className={incomeTrend.trend === 'up' ? styles.trendUp : styles.trendDown}>
                      <i className={`fas fa-arrow-${incomeTrend.trend}`}></i> Receitas
                    </span>
                  </p>
                )}
                {expenseTrend && (
                  <p>
                    <span className={expenseTrend.trend === 'down' ? styles.trendUp : styles.trendDown}>
                      <i className={`fas fa-arrow-${expenseTrend.trend}`}></i> Despesas
                    </span>
                  </p>
                )}
                {balanceTrend && (
                  <p>
                    <span className={balanceTrend.trend === 'up' ? styles.trendUp : styles.trendDown}>
                      <i className={`fas fa-arrow-${balanceTrend.trend}`}></i> Saldo
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
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
        
        {/* Monthly Comparison Chart */}
        <div className={styles.chartContainer}>
          {renderMonthlyComparisonChart()}
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
            // Definir as funções inline para não depender de referências externas
            const fetchData = async () => {
              try {
                console.log("Buscando dados do dashboard...");
                
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
                
                return result;
              } catch (err) {
                console.error("Erro ao buscar dados do dashboard:", err);
                throw err;
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
                
                return result;
              } catch (err) {
                console.error("Erro ao buscar transações:", err);
                throw err;
              }
            };
            
            // Execute as duas chamadas em paralelo
            Promise.all([fetchData(), fetchAllTransactions()])
              .then(() => {
                setLoading(false);
              })
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

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'var(--card-background)', 
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: isMobile ? '6px 8px' : '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          maxWidth: isMobile ? '150px' : '180px'
        }}>
          <p style={{ 
            margin: '0 0 5px 0', 
            fontWeight: 'bold', 
            color: 'var(--text-color)',
            fontSize: isMobile ? '10px' : '12px' 
          }}>
            {payload[0].name}
          </p>
          <p style={{ 
            margin: '0', 
            color: payload[0].color,
            fontSize: isMobile ? '10px' : '12px'
          }}>
            {formatCurrency(payload[0].value)} ({(payload[0].payload.percent * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Função para formatar labels de datas nos gráficos
  const formatDateLabel = (label, chartDataArray = []) => {
    if (typeof label !== 'string') {
      if (label instanceof Date) {
        const month = label.getMonth() + 1;
        const year = label.getFullYear();
        // Procurar um ponto de dados com esta data se ele existir
        let dataPoint = null;
        if (chartDataArray && chartDataArray.length > 0) {
          dataPoint = chartDataArray.find(d => {
            if (d.date instanceof Date) {
              return d.date.getMonth() === label.getMonth() && 
                     d.date.getFullYear() === label.getFullYear();
            } else if (typeof d.date === 'string') {
              const parts = d.date.split('-');
              if (parts.length >= 2) {
                return parseInt(parts[0]) === year && parseInt(parts[1]) === month;
              }
            }
            return false;
          });
        }
        const monthName = months.find(m => m.value === month)?.label || month;
        return `${monthName}/${year}${dataPoint?.isProjection ? ' (Projeção)' : ''}`;
      }
      return String(label);
    }
    
    const parts = label.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      // Procurar um ponto de dados com esta data se ele existir
      let dataPoint = null;
      if (chartDataArray && chartDataArray.length > 0) {
        dataPoint = chartDataArray.find(d => {
          if (typeof d.date === 'string') {
            return d.date === label;
          }
          return false;
        });
      }
      const monthName = months.find(m => m.value === month)?.label || month;
      return `${monthName}/${year}${dataPoint?.isProjection ? ' (Projeção)' : ''}`;
    }
    
    return label;
  };

  return (
    <div>
      {getGreeting(auth.user ? auth.user.name : 'Usuário')}
      
      <div>
        <div>
          <h3>Filtros e Período</h3>
          
          <div>
            <button
              onClick={() => setShowPeriodOptions(!showPeriodOptions)}
            >
              {formatCurrentDateFilter()}
            </button>
            
            {showPeriodOptions && (
              <div>
                <div>
                  <button
                    onClick={() => handlePeriodChange('current')}
                  >
                    Mês Atual
                  </button>
                  <button
                    onClick={() => handlePeriodChange('last')}
                  >
                    Mês Anterior
                  </button>
                  <button
                    onClick={() => handlePeriodChange('year')}
                  >
                    Ano Atual
                  </button>
                  <button
                    onClick={() => handlePeriodChange('custom')}
                  >
                    Personalizado
                  </button>
                </div>
              </div>
            )}
            
            {showDateRangePicker && (
              <DateRangePicker
                onSelect={handleDateRangeSelect}
                onCancel={handleDateRangeCancel}
              />
            )}
          </div>
          
          <div>
            <FilterSelector 
              label="Categorias"
              options={categories}
              selected={selectedCategories}
              onSelect={handleCategoryChange}
              multiple={true}
            />
            
            <FilterSelector 
              label="Contas"
              options={banks}
              selected={selectedBanks}
              onSelect={handleBankChange}
              multiple={true}
            />
          </div>
        </div>
        
        <div>
          {renderOverviewCharts()}
        </div>
      </div>
      
      {/* Dashboard tabs */}
      <div>
        <div>
          <button
            onClick={() => setActiveSection('overview')}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
          >
            Análises
          </button>
          <button
            onClick={() => setActiveSection('timeline')}
          >
            Linha do Tempo
          </button>
        </div>
        
        <div>
          {activeSection === 'overview' && (
            <div>
              <div>
                {loading ? (
                  <div>
                    <div></div>
                    <p>Carregando dados do dashboard...</p>
                  </div>
                ) : error ? (
                  <div>
                    <h3>Erro ao carregar dados</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div>
                        <BankBalanceTrend />
                      </div>
                      <div>
                        {renderBudgetChart()}
                      </div>
                    </div>
                    
                    <div>
                      <div>
                        {renderExpensesByCategoryChart()}
                      </div>
                      <div>
                        {renderIncomeVsExpensesChart()}
                      </div>
                    </div>
                    
                    <div>
                      <div>
                        {renderFinancialGoalChart()}
                      </div>
                      <div>
                        {data?.financial_health && (
                          <FinancialHealthScore data={data.financial_health} />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {activeSection === 'analytics' && (
            <div>
              <div>
                <h3>Análise de Despesas e Receitas</h3>
                
                <div>
                  <div>
                    {renderExpensesTrend()}
                  </div>
                  <div>
                    {renderIncomeTrend()}
                  </div>
                </div>
                
                <div>
                  <div>
                    {renderMonthlyComparisonChart()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeSection === 'timeline' && (
            <div>
              {renderTimelineChart()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
