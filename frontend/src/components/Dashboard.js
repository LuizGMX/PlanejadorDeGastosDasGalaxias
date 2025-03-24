import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
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
      <h2>{greeting}, {userName}!</h2>
      <p className={styles.motivationalPhrase}>{randomPhrase}</p>
    </div>
  );
};

const BankBalanceTrend = ({ showTitle = true, showControls = true, height = 300, containerStyle = {} }) => {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectionMonths, setProjectionMonths] = useState(3);

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

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>Erro: {error}</div>;
  if (!data) return null;

  const formatFullCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div style={containerStyle} className={styles.trendChartContainer}>
      {showTitle && <h2 className={styles.trendChartTitle}>Projeção de Saldo</h2>}
      
      {showControls && (
        <div className={styles.trendChartControls}>
          <label>Meses de Projeção: </label>
          <select 
            value={projectionMonths} 
            onChange={(e) => setProjectionMonths(Number(e.target.value))}
            className={styles.trendChartSelect}
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data.projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
          <Line
            type="monotone"
            dataKey="ganhos"
            stroke="var(--success-color)"
            strokeWidth={2}
            dot={{ fill: 'var(--success-color)', r: 4 }}
            activeDot={{ r: 6, fill: 'var(--success-color)' }}
          />
          <Line
            type="monotone"
            dataKey="despesas"
            stroke="var(--error-color)"
            strokeWidth={2}
            dot={{ fill: 'var(--error-color)', r: 4 }}
            activeDot={{ r: 6, fill: 'var(--error-color)' }}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#1E90FF"
            strokeWidth={2}
            dot={{ fill: '#1E90FF', r: 4 }}
            activeDot={{ r: 6, fill: '#1E90FF' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className={styles.trendChartSummary}>
        <div className={styles.trendChartSummaryItem} style={{ marginBottom: '1rem' }}>
          <span>Ganhos Projetados </span>
          <strong className={styles.positive}>
            {formatFullCurrency(data.summary.totalProjectedIncomes)}
          </strong>
        </div>
        <div className={styles.trendChartSummaryItem} style={{ marginBottom: '1rem' }}>
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
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);  
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()]
  });
  const [openFilter, setOpenFilter] = useState(null);
  const chartRefs = {
    'income-vs-expenses': useRef(null),
    'categories': useRef(null),
    'timeline': useRef(null),
    'income-categories': useRef(null),
    'banks': useRef(null),
    'budget': useRef(null)
  };
  

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
    '#FF6B6B',  // Vermelho coral
    '#4ECDC4',  // Turquesa
    '#45B7D1',  // Azul celeste
    '#96CEB4',  // Verde menta
    '#FFEEAD',  // Amarelo pastel
    '#D4A5A5',  // Rosa antigo
    '#9B5DE5',  // Roxo vibrante
    '#F15BB5',  // Rosa chiclete
    '#00BBF9',  // Azul elétrico
    '#00F5D4',  // Verde água
    '#FEE440',  // Amarelo vivo
    '#FF99C8',  // Rosa suave
    '#A8E6CF',  // Verde suave
    '#FDFFAB',  // Amarelo claro
    '#FFB3BA'   // Rosa claro
  ];

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
        setData(jsonData);
        setError(null);

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, navigate, filters]);

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
    setExpandedChart(prevChartId => prevChartId === chartId ? null : chartId);
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
      return null;
    }

    const goal = data.financial_goal;
    const chartData = [{
      name: 'Progresso',
      economia: goal.total_saved > goal.amount ? goal.amount : goal.total_saved,
      projecao: goal.projected_savings > goal.amount ? goal.amount - goal.total_saved : goal.projected_savings - goal.total_saved,
      faltante: goal.projected_savings > goal.amount ? 0 : goal.amount - goal.projected_savings
    }];

    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>Progresso do Objetivo Financeiro</h3>
          <p className={styles.goalInfo}>
            Meta: {formatCurrency(goal.amount)} até {new Date(goal.date).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className={styles.chartInfo}>
          <div className={styles.infoItem}>
            <span>Economia Mensal Média:</span>
            <strong className={goal.monthly_balance >= goal.monthly_needed ? styles.positive : styles.negative}>
              {formatCurrency(goal.monthly_balance)}
            </strong>
          </div>
          <div className={styles.infoItem}>
            <span>Economia Mensal Necessária:</span>
            <strong>{formatCurrency(goal.monthly_needed)}</strong>
          </div>
          <div className={styles.infoItem}>
            <span>Total Economizado:</span>
            <strong className={styles.positive}>{formatCurrency(goal.total_saved)}</strong>
          </div>
          <div className={styles.infoItem}>
            <span>Meses desde o início:</span>
            <strong>{goal.months_since_start}</strong>
          </div>
          <div className={styles.infoItem}>
            <span>Meses até o objetivo:</span>
            <strong>{goal.months_remaining}</strong>
          </div>
          {!goal.is_achievable && (
            <div className={styles.infoItem}>
              <span>Meses necessários no ritmo atual:</span>
              <strong className={styles.negative}>{goal.months_needed_with_current_savings}</strong>
            </div>
          )}
        </div>

        {!goal.is_achievable && (
          <div className={styles.warning}>
            <span className="material-icons">warning</span>
            <p>
              Com a economia mensal média atual de {formatCurrency(goal.monthly_balance)}, 
              você precisará de {goal.months_needed_with_current_savings} meses para atingir seu objetivo, 
              {goal.months_needed_with_current_savings > goal.months_remaining 
                ? ` ou seja, ${goal.months_needed_with_current_savings - goal.months_remaining} meses além do prazo definido.`
                : ' mas ainda está dentro do prazo definido.'}
            </p>
          </div>
        )}

        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
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
                        `${name} (${(percent * 100).toFixed(0)}%)`
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

  const renderTimelineChart = () => {
    if (!data || !data.timeline) return null;

    const timelineData = data.timeline.map(item => ({
      date: new Date(item.date),
      description: item.description,
      amount: item.amount,
      type: item.type,
      category: item.Category?.name || 'Sem categoria',
      subcategory: item.Subcategory?.name || 'Sem subcategoria',
      bank: item.Bank?.name || 'Sem banco',
      is_recurring: item.is_recurring,
      recurrence_id: item.recurrence_id
    }));

    timelineData.sort((a, b) => a.date - b.date);

    const formattedData = timelineData.map(item => ({
      ...item,
      date: formatDate(item.date),
      formattedAmount: formatCurrency(item.amount),
      color: item.type === 'income' ? 'var(--success-color)' : 'var(--error-color)',
      icon: item.is_recurring ? '🔄' : (item.type === 'income' ? '💰' : '💸')
    }));

    return (
      <div className={styles.timelineContainer}>
        <h3>Linha do Tempo</h3>
        <div className={styles.timeline}>
          {formattedData.map((item, index) => (
            <div key={index} className={styles.timelineItem}>
              <div className={styles.timelineDate}>
                <span>{item.date}</span>
                <span className={styles.timelineIcon}>{item.icon}</span>
              </div>
              <div className={styles.timelineContent} style={{ borderColor: item.color }}>
                <div className={styles.timelineHeader}>
                  <h4>{item.description}</h4>
                  <span style={{ color: item.color }}>{item.formattedAmount}</span>
                </div>
                <div className={styles.timelineDetails}>
                  <span>{item.category} {item.subcategory !== 'Sem subcategoria' ? `> ${item.subcategory}` : ''}</span>
                  <span>{item.bank}</span>
                  {item.is_recurring && (
                    <span className={styles.recurringBadge} title="Transação Recorrente">
                      Recorrente
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCategoriesChart = () => {
    if (!data || !data.categories) return null;

    const categoriesData = data.categories.map(category => ({
      name: category.name,
      value: category.total,
      color: category.color || '#' + Math.floor(Math.random()*16777215).toString(16),
      details: category.subcategories.map(sub => ({
        name: sub.name,
        value: sub.total,
        recurring: sub.recurring_total || 0,
        normal: sub.normal_total || 0
      }))
    }));

    return (
      <div className={styles.chartContainer}>
        <h3>Despesas por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoriesData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {categoriesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.categoriesLegend}>
          {categoriesData.map((category, index) => (
            <div key={index} className={styles.categoryItem}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryColor} style={{ backgroundColor: category.color }}></span>
                <span className={styles.categoryName}>{category.name}</span>
                <span className={styles.categoryValue}>{formatCurrency(category.value)}</span>
              </div>
              {category.details.length > 0 && (
                <div className={styles.subcategories}>
                  {category.details.map((sub, subIndex) => (
                    <div key={subIndex} className={styles.subcategoryItem}>
                      <span className={styles.subcategoryName}>{sub.name}</span>
                      <div className={styles.subcategoryValues}>
                        {sub.recurring > 0 && (
                          <span className={styles.recurringValue} title="Valor Recorrente">
                            🔄 {formatCurrency(sub.recurring)}
                          </span>
                        )}
                        {sub.normal > 0 && (
                          <span className={styles.normalValue} title="Valor Normal">
                            {formatCurrency(sub.normal)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIncomeCategoriesChart = () => {
    if (!data?.incomes_by_category?.length) return null;

    return renderChart('income-categories', 'Ganhos por Categoria',
                  <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={data.incomes_by_category}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category_name, percent }) =>
                        `${category_name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {data.incomes_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
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

  const renderBanksChart = () => {
    if (!data?.expenses_by_bank?.length) return null;

    return renderChart('banks', 'Gastos por Banco',
                  <BarChart data={data.expenses_by_bank} margin={{ top: 10, right: 30, left: 80, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="bank_name"
                      tick={{ fill: 'var(--text-color)' }}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tick={{ fill: 'var(--text-color)' }}
                      width={80}
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
                      formatter={(value) => <span style={{ color: 'var(--text-color)' }}>Total por Banco</span>}
                    />
                    <Bar dataKey="total" fill="var(--primary-color)">
                      {data.expenses_by_bank.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
    );
  };

  const renderBudgetChart = () => {
    if (!data?.budget_info) return null;

    return (
      <div className={styles.budgetInfoContainer}>
        <h3>Informações do Orçamento</h3>
        <div className={styles.budgetStats}>
          <div className={styles.budgetStat}>
            <span>Orçamento Total:</span>
            <strong>{formatCurrency(data.budget_info.total_budget)}</strong>
          </div>
          <div className={styles.budgetStat}>
            <span>Gasto até agora:</span>
            <strong className={data.budget_info.percentage_spent > 100 ? styles.overBudget : ''}>
              {formatCurrency(data.budget_info.total_spent)}
            </strong>
          </div>
          <div className={styles.budgetStat}>
            <span>Restante:</span>
            <strong className={data.budget_info.remaining_budget < 0 ? styles.overBudget : ''}>
              {formatCurrency(data.budget_info.total_budget - data.budget_info.total_spent)}
            </strong>
          </div>
          {data.budget_info.remaining_days > 0 && (
            <div className={styles.budgetStat}>
              <span>Sugestão de gasto diário:</span>
              <strong className={data.budget_info.suggested_daily_spend < 0 ? styles.overBudget : ''}>
                {formatCurrency(data.budget_info.suggested_daily_spend)}
                <div className={styles.dailySpendingInfo}>
                  {data.budget_info.suggested_daily_spend < 0
                    ? 'Orçamento já estourado para este mês'
                    : 'por dia até o final do mês para manter-se dentro do orçamento'}
                </div>
              </strong>
            </div>
          )}
        </div>
        <div className={styles.budgetProgressBar}>
          <div
            className={`${styles.budgetProgress} ${data.budget_info.percentage_spent > 90
              ? styles.dangerProgress
              : data.budget_info.percentage_spent > 60
                ? styles.warningProgress
                : ''
              }`}
            style={{ width: `${Math.min(data.budget_info.percentage_spent, 100)}%` }}
          />
          <span className={data.budget_info.percentage_spent > 100 ? styles.overBudget : ''}>
            {data.budget_info.percentage_spent.toFixed(1)}% utilizado
            {data.budget_info.percentage_spent > 100 && ' (Orçamento Estourado)'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div>Nenhum dado encontrado</div>;

  return (
    <div className={styles.dashboardContainer}>
      {getGreeting(auth.user?.name || 'Usuário')}
      <div className={styles.filtersContainer}>
        <div className={styles.modernSelect}>
          <div
            className={`${styles.selectedValue} ${openFilter === 'months' ? styles.active : ''}`}
            onClick={() => handleFilterClick('months')}
          >
            <span>{formatSelectedMonths()}</span>
            <span className={styles.arrow}>▼</span>
          </div>
          {openFilter === 'months' && (
            <div className={styles.options}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <label key={month} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={filters.months.includes(month)}
                    onChange={() => handleFilterChange('months', month)}
                    onClick={handleCheckboxClick}
                  />
                  {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modernSelect}>
          <div
            className={`${styles.selectedValue} ${openFilter === 'years' ? styles.active : ''}`}
            onClick={() => handleFilterClick('years')}
          >
            <span>{formatSelectedYears()}</span>
            <span className={styles.arrow}>▼</span>
          </div>
          {openFilter === 'years' && (
            <div className={styles.options}>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                <label key={year} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={filters.years.includes(year)}
                    onChange={() => handleFilterChange('years', year)}
                    onClick={handleCheckboxClick}
                  />
                  {year}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : error ? (
        <div className={styles.error}>Erro: {error}</div>
      ) : noExpensesMessage ? (
        <div className={styles.noExpensesContainer}>
          <h2>Nenhuma transação encontrada</h2>
          <p>{noExpensesMessage}</p>
          <div className={styles.buttonGroup}>
            <button
              className={styles.addFirstExpenseButton}
              onClick={() => navigate('/expenses/add')}
            >
              Adicionar Despesa
            </button>
            <button
              className={styles.addFirstExpenseButton}
              onClick={() => navigate('/incomes/add')}
            >
              Adicionar Receita
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.chartsGrid}>
            <div className={styles.chartContainer}>
              <BankBalanceTrend showTitle={true} showControls={true} height={300} />
            </div>

            <div className={styles.chartContainer}>
              {renderFinancialGoalChart()}
            </div>

            <div className={styles.chartContainer}>
              {renderBudgetChart()}
            </div>

            <div className={styles.chartContainer}>
              {renderIncomeVsExpensesChart()}
            </div>

            <div className={styles.chartContainer}>
              {renderCategoriesChart()}
            </div>

            <div className={styles.chartContainer}>
              {renderIncomeCategoriesChart()}
            </div>

            <div className={styles.chartContainer}>
              {renderBanksChart()}
            </div>
          </div>

          {renderTimelineChart()}
        </>
      )}
    </div>
  );
};

export default Dashboard;