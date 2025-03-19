import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,  
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell  
} from 'recharts';
import styles from '../styles/dashboard.module.css';
import logo from '../assets/logo.svg';
  
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

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  if (!data) return null;

  const formatFullCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div style={containerStyle}>
      {showTitle && <h2>Projeção de Saldo</h2>}
      
      {showControls && (
        <div style={{ marginBottom: '20px' }}>
          <label>Meses de Projeção: </label>
          <select 
            value={projectionMonths} 
            onChange={(e) => setProjectionMonths(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data.projectionData}>
          <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { month: 'short' })}
            />
            <YAxis
            tickFormatter={(value) => formatFullCurrency(value)}
            />
            <Tooltip
            formatter={(value) => formatFullCurrency(value)}
            labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
          />
          <Legend />
            <Line
            type="monotone" 
              dataKey="incomes"
              stroke="var(--success-color)"
            name="Ganhos"
            />
            <Line
            type="monotone" 
              dataKey="expenses"
              stroke="var(--error-color)"
            name="Despesas"
            />
            <Line
              type="monotone"
              dataKey="balance"
            stroke="var(--primary-color)" 
            name="Saldo"
          />
        </LineChart>
        </ResponsiveContainer>

      <div
  className={styles.summary}
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px',
    backgroundColor: 'var(--card-background)',
    borderRadius: '8px',
    marginTop: '20px'
  }}
>
  <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
    <span
      style={{
        display: 'block',
        marginBottom: '5px',
        color: 'var(--text-color)'
      }}
    >
      Ganhos Projetados ({projectionMonths} meses)
    </span>
    <strong
      style={{
        color: 'var(--success-color)',
        fontSize: '1.2em'
      }}
    >
      {formatFullCurrency(data.summary.totalProjectedIncomes)}
    </strong>
      </div>
  <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
    <span
      style={{
        display: 'block',
        marginBottom: '5px',
        color: 'var(--text-color)'
      }}
    >
      Despesas Projetadas ({projectionMonths} meses)
    </span>
    <strong
      style={{
        color: 'var(--error-color)',
        fontSize: '1.2em'
      }}
    >
      {formatFullCurrency(data.summary.totalProjectedExpenses)}
    </strong>
  </div>
  <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
    <span
      style={{
        display: 'block',
        marginBottom: '5px',
        color: 'var(--text-color)'
      }}
    >
      Saldo Final
    </span>
    <strong
      style={{
        color:
          data.summary.finalBalance >= 0
            ? 'var(--success-color)'
            : 'var(--error-color)',
        fontSize: '1.2em'
      }}
    >
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
  const years = Array.from(
    { length: 5 },
    (_, i) => ({
      value: new Date().getFullYear() - i,
      label: (new Date().getFullYear() - i).toString()
    })
  );

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

        // Verifica se todos os itens foram selecionados manualmente
        const totalItems = type === 'months' ? months.length : years.length;
        if (newValues.length === totalItems - 1) {
          return {
            ...prev,
            [type]: type === 'months'
              ? months.map(m => m.value)
              : years.map(y => y.value)
          };
        }

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
    console.log("renderFinancialGoalChart", data);
    if (!data?.financial_goal) return null;

    const goal = data.financial_goal;
    const chartData = [{
      name: 'Progresso',
      economia: goal.projected_savings > goal.amount ? goal.amount : goal.projected_savings,
      faltante: goal.projected_savings > goal.amount ? 0 : goal.amount - goal.projected_savings
    }];
    const isAchievable = data.budget_info.total_budget - data.budget_info.total_spent >= goal.monthly_needed;

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
            <span>Economia Mensal Atual:</span>
            <strong className={data.budget_info.total_budget - data.budget_info.total_spent >= goal.monthly_needed ? styles.positive : styles.negative}>
            {formatCurrency(data.budget_info.total_budget - data.budget_info.total_spent)}  
            </strong>
          </div>
          <div className={styles.infoItem}>
            <span>Economia Mensal Necessária:</span>
            <strong>{formatCurrency(goal.monthly_needed)}</strong>
        </div>
          <div className={styles.infoItem}>
            <span>Meses Restantes:</span>
            <strong>{goal.months_remaining}</strong>
                </div>
                        </div>
                        
        {isAchievable && (
          <div className={!isAchievable ? styles.warning : styles.positive}>
            
            <p> <span className="material-icons">{!isAchievable ? 'warning' : 'check_circle'}</span> Com a economia mensal atual, você {isAchievable ? 'alcançará' : 'não alcançará'} seu objetivo no prazo definido.</p>
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
                  color: 'var(--text-color)'
                }}
                labelStyle={{ color: 'var(--text-color)' }}
              />
              <Legend
                formatter={(value) => {
                  switch (value) {
                    case 'economia':
                      return <span style={{ color: 'var(--text-color)' }}>Economia Projetada</span>;
                    case 'faltante':
                      return <span style={{ color: 'var(--text-color)' }}>Faltante</span>;
                    default:
                      return <span style={{ color: 'var(--text-color)' }}>{value}</span>;
                  }
                }}
              />
              <Bar dataKey="economia" stackId="a" fill="var(--success-color)" />
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
                        color: 'var(--text-color)'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>}
                    />
                  </PieChart>
    );
  };

  const renderCategoriesChart = () => {
    if (!data?.expenses_by_category?.length) return null;

    return renderChart('categories', 'Gastos por Categoria',
                  <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={data.expenses_by_category}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category_name, percent }) =>
                        `${category_name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {data.expenses_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatCurrency}
                      contentStyle={{
                        backgroundColor: 'var(--card-background)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-color)'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>}
                    />
                  </PieChart>
    );
  };

  const renderTimelineChart = () => {
    if (!data?.expenses_by_date?.length) return null;

    const chartData = (() => {
                      const hasMultipleYears = filters.years.length > 1;
                      const hasMoreThan30Days = data.expenses_by_date.length > 30;

                      if (hasMultipleYears) {
        return data.expenses_by_date.reduce((acc, curr) => {
                          const year = new Date(curr.date).getFullYear();
                          const existingEntry = acc.find(item => item.date === year);
                          
                          if (existingEntry) {
                            existingEntry.total += curr.total;
                          } else {
                            acc.push({ date: year, total: curr.total });
                          }
                          return acc;
                        }, []);
                      } else if (hasMoreThan30Days) {
        return data.expenses_by_date.reduce((acc, curr) => {
                          const date = new Date(curr.date);
                          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          const existingEntry = acc.find(item => item.date === monthYear);
                          
                          if (existingEntry) {
                            existingEntry.total += curr.total;
                          } else {
                            acc.push({ date: monthYear, total: curr.total });
                          }
                          return acc;
                        }, []);
                      }
                      
                      return data.expenses_by_date;
    })();

    return renderChart('timeline', 'Gastos ao Longo do Tempo',
      <LineChart
        data={chartData}
                    margin={{ top: 10, right: 30, left: 80, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-color)' }}
                      tickFormatter={(value) => {
                        if (Number.isInteger(value)) return value;
                        const date = new Date(value);
            if (filters.years.length > 1) return date.getFullYear();
                        if (data.expenses_by_date.length > 30) {
                          const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                          return `${months[date.getMonth()]} ${date.getFullYear()}`;
                        }
                        return formatDate(value);
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      padding={{ left: 20, right: 20 }}
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
                        color: 'var(--text-color)'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'var(--text-color)' }}>Total Gasto</span>}
                      verticalAlign="top"
                      height={36}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary-color)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--primary-color)', r: 4 }}
                      activeDot={{ r: 6, fill: 'var(--primary-color)' }}
                    />
                  </LineChart>
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
                        color: 'var(--text-color)'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
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
                        color: 'var(--text-color)'
                      }}
                      labelStyle={{ color: 'var(--text-color)' }}
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

<div className={styles.logo}>
      <img src={logo} alt="Logo do Planejador de Gastos das Galáxias" className={styles.logo} />
  </div>
      
      {getGreeting(auth.user?.name || 'Usuário')}
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
      </div>

      {noExpensesMessage ? (
        <div className={styles.noExpensesContainer}>
          <h2>{noExpensesMessage.message}</h2>
          <p>{noExpensesMessage.suggestion}</p>
          <div className={styles.buttonGroup}>
            <button
              className={styles.addFirstExpenseButton}
              onClick={() => navigate('/add-expense')}
            >
              Adicionar Primeira Despesa
            </button>
            <button
              className={styles.backButton}
              onClick={() => {
                setFilters({
                  months: [new Date().getMonth() + 1],
                  years: [new Date().getFullYear()]
                });
              }}
            >
              Voltar para Mês Atual
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <div
                className={`${styles.modernSelect} ${openFilter === 'months' ? styles.active : ''}`}
                onClick={() => handleFilterClick('months')}
              >
                <div className={styles.modernSelectHeader}>
                  <span>{formatSelectedMonths()}</span>
                  <span className={`material-icons ${styles.arrow}`}>
                    {openFilter === 'months' ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
                {openFilter === 'months' && (
                  <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                    <label
                      key="all-months"
                      className={styles.modernCheckboxLabel}
                      onClick={handleCheckboxClick}
                    >
                      <div className={styles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.months.length === months.length}
                          onChange={() => handleFilterChange('months', 'all')}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.customCheckbox}>
                          <span className="material-icons">check</span>
                        </div>
                      </div>
                      <span><strong>Todos os Meses</strong></span>
                    </label>
                    <div className={styles.divider}></div>
                    {months.map(month => (
                      <label
                        key={month.value}
                        className={styles.modernCheckboxLabel}
                        onClick={handleCheckboxClick}
                      >
                        <div className={styles.modernCheckbox}>
                          <input
                            type="checkbox"
                            checked={filters.months.includes(month.value)}
                            onChange={() => handleFilterChange('months', month.value)}
                            className={styles.hiddenCheckbox}
                          />
                          <div className={styles.customCheckbox}>
                            <span className="material-icons">check</span>
                          </div>
                        </div>
                        <span>{month.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div
                className={`${styles.modernSelect} ${openFilter === 'years' ? styles.active : ''}`}
                onClick={() => handleFilterClick('years')}
              >
                <div className={styles.modernSelectHeader}>
                  <span>{formatSelectedYears()}</span>
                  <span className={`material-icons ${styles.arrow}`}>
                    {openFilter === 'years' ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
                {openFilter === 'years' && (
                  <div className={styles.modernSelectDropdown} onClick={e => e.stopPropagation()}>
                    <label
                      key="all-years"
                      className={styles.modernCheckboxLabel}
                      onClick={handleCheckboxClick}
                    >
                      <div className={styles.modernCheckbox}>
                        <input
                          type="checkbox"
                          checked={filters.years.length === years.length}
                          onChange={() => handleFilterChange('years', 'all')}
                          className={styles.hiddenCheckbox}
                        />
                        <div className={styles.customCheckbox}>
                          <span className="material-icons">check</span>
                        </div>
                      </div>
                      <span><strong>Todos os Anos</strong></span>
                    </label>
                    <div className={styles.divider}></div>
                    {years.map(year => (
                      <label
                        key={year.value}
                        className={styles.modernCheckboxLabel}
                        onClick={handleCheckboxClick}
                      >
                        <div className={styles.modernCheckbox}>
                          <input
                            type="checkbox"
                            checked={filters.years.includes(year.value)}
                            onChange={() => handleFilterChange('years', year.value)}
                            className={styles.hiddenCheckbox}
                          />
                          <div className={styles.customCheckbox}>
                            <span className="material-icons">check</span>
                          </div>
                        </div>
                        <span>{year.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
         {data.budget_info && filters.month !== 'all' && filters.year !== 'all' && (
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
          )}

          <div className={styles.chartsGrid}>
            {renderFinancialGoalChart()}
            {renderIncomeVsExpensesChart()}
            {renderCategoriesChart()}
            {renderTimelineChart()}
            {renderIncomeCategoriesChart()}
            {renderBanksChart()}
          </div>

          <div className={styles.chartsGrid}>
            <div className={`${styles.chartContainer} ${styles.trendChart}`}>
              <div className={styles.chartHeader}>
                <h3>Tendência de Saldo Bancário</h3>
              </div>
              <BankBalanceTrend
                showTitle={false}
                showControls={true}
                height={expandedChart === 'bank-balance-trend' ? 600 : 300}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;