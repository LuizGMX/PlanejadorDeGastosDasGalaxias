import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from 'recharts';
import styles from '../styles/dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);
  const [data, setData] = useState({
    expenses_by_category: [],
    expenses_by_date: [],
    expenses_by_bank: [],
    budget_info: null,
    total_expenses: 0,
    current_filters: {}
  });
  const [noExpensesMessage, setNoExpensesMessage] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()]
  });
  const [openFilter, setOpenFilter] = useState(null);

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
    'var(--primary-color)',
    'var(--gradient-end)',
    'var(--success-color)',
    'var(--error-color)',
    '#8B8D97',
    '#4A4B53',
    '#6A6B73',
    '#3A3B43',
    '#5A5B63',
    '#2A2B33'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams();
        filters.months.forEach(month => queryParams.append('months[]', month));
        filters.years.forEach(year => queryParams.append('years[]', year));
        
        const response = await fetch(`/api/dashboard?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
        }

        const responseData = await response.json();
        console.log('Response data:', responseData); // Debug

        if (responseData.message && responseData.suggestion) {
          setNoExpensesMessage({ 
            message: responseData.message, 
            suggestion: responseData.suggestion 
          });
        } else {
          setNoExpensesMessage(null);
        }

        // Calculando informações do orçamento baseado no net_income
        const totalExpenses = responseData.expenses_by_date.reduce((sum, day) => sum + day.total, 0);
        const netIncome = responseData.user?.net_income;
        
        console.log('Net Income:', netIncome); // Debug

        if (!netIncome && netIncome !== 0) {
          console.error('Net income não encontrado nos dados do usuário:', responseData.user);
        }

        const budget_info = {
          total_budget: netIncome || 0,
          total_spent: totalExpenses,
          remaining_budget: (netIncome || 0) - totalExpenses,
          percentage_spent: ((totalExpenses / (netIncome || 1)) * 100),
          remaining_days: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
        };

        // Calculando sugestão de gasto diário se houver dias restantes
        if (budget_info.remaining_days > 0) {
          budget_info.suggested_daily_spend = budget_info.remaining_budget / budget_info.remaining_days;
        }

        setData({
          ...responseData,
          budget_info
        });
        
        console.log('Dashboard data:', {
          net_income: netIncome,
          expenses_by_date: responseData.expenses_by_date,
          budget_info
        });

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, filters]);

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
    if (filters.month === 'all') {
      const [year, month] = date.split('-');
      return `${months.find(m => m.value === parseInt(month))?.label}/${year}`;
    }
    return new Date(date).toLocaleDateString('pt-BR');
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

  const handleChartExpand = (chartId) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  const renderChart = (chartId, title, chartComponent) => {
    const isExpanded = expandedChart === chartId;
    return (
      <div 
        className={`${styles.chartContainer} ${isExpanded ? styles.expanded : ''}`}
      >
        <div className={styles.chartHeader}>
          <h3>{title} - {formatPeriod()}</h3>
          <button 
            className={styles.expandButton}
            onClick={(e) => {
              e.stopPropagation();
              handleChartExpand(chartId);
            }}
          >
            {isExpanded ? 'Minimizar' : 'Expandir'}
          </button>
        </div>
        <ResponsiveContainer width="100%" height={isExpanded ? 600 : 300}>
          {chartComponent}
        </ResponsiveContainer>
      </div>
    );
  };

  const handleFilterClick = (filterType) => {
    setOpenFilter(openFilter === filterType ? null : filterType);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation(); // Impede que o clique no checkbox feche o dropdown
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
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
                  <span>Meses Selecionados ({filters.months.length})</span>
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
                  <span>Anos Selecionados ({filters.years.length})</span>
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
                    {formatCurrency(data.budget_info.remaining_budget)}
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
                  className={`${styles.budgetProgress} ${
                    data.budget_info.percentage_spent > 90 
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

          {data.expenses_by_category && data.expenses_by_category.length > 0 && (
            <div className={styles.chartsGrid}>
              {renderChart('income-vs-expenses', 'Gastos vs. Renda',
                <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                  <Pie
                    data={[
                      { 
                        name: 'Disponível', 
                        value: Math.max(0, data.budget_info.remaining_budget)
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
              )}

              {renderChart('timeline', 'Gastos ao Longo do Tempo',
                <LineChart data={data.expenses_by_date} margin={{ top: 10, right: 30, left: 80, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date"
                    tick={{ fill: 'var(--text-color)' }}
                    tickFormatter={formatDate}
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
                    labelFormatter={formatDate}
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
              )}

              {renderChart('categories', 'Gastos por Categoria',
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
              )}

              {renderChart('banks', 'Gastos por Banco',
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
              )}
            </div>
          )}

          {data.budget_info && data.expenses_by_date && data.expenses_by_date.length > 0 && (
            <div className={styles.chartsGrid}>
              {renderChart('budget', 'Acompanhamento do Orçamento',
                <ComposedChart 
                  data={filters.month === 'all' 
                    ? Object.entries(data.expenses_by_date.reduce((acc, day) => {
                        const [year, month] = day.date.split('-');
                        const key = `${year}-${month}`;
                        if (!acc[key]) {
                          acc[key] = {
                            date: key,
                            total: 0,
                            accumulated: 0
                          };
                        }
                        acc[key].total += day.total;
                        return acc;
                      }, {}))
                      .map(([date, data]) => ({
                        ...data,
                        accumulated: data.total,
                        budget: data.budget_info?.total_budget,
                        overBudget: data.total > (data.budget_info?.total_budget || 0) ? data.total : null
                      }))
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                    : data.expenses_by_date.map((day, index, arr) => {
                        const accumulated = arr
                          .slice(0, index + 1)
                          .reduce((sum, d) => sum + d.total, 0);
                        return {
                          ...day,
                          accumulated,
                          budget: data.budget_info.total_budget,
                          overBudget: accumulated > data.budget_info.total_budget ? accumulated : null
                        };
                      })
                  }
                  margin={{ top: 10, right: 30, left: 80, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date"
                    tick={{ fill: 'var(--text-color)' }}
                    tickFormatter={formatDate}
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
                    formatter={(value, name) => {
                      switch(name) {
                        case 'accumulated':
                          return [formatCurrency(value), 'Gasto Acumulado'];
                        case 'budget':
                          return [formatCurrency(value), 'Orçamento'];
                        case 'overBudget':
                          return [formatCurrency(value), 'Acima do Orçamento'];
                        default:
                          return [formatCurrency(value), name];
                      }
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-color)'
                    }}
                    labelFormatter={formatDate}
                    labelStyle={{ color: 'var(--text-color)' }}
                  />
                  <Legend formatter={(value) => {
                    switch(value) {
                      case 'accumulated':
                        return <span style={{ color: 'var(--text-color)' }}>Gasto Acumulado</span>;
                      case 'budget':
                        return <span style={{ color: 'var(--text-color)' }}>Orçamento</span>;
                      case 'overBudget':
                        return <span style={{ color: 'var(--text-color)' }}>Acima do Orçamento</span>;
                      default:
                        return <span style={{ color: 'var(--text-color)' }}>{value}</span>;
                    }
                  }} />
                  <Area 
                    type="monotone" 
                    dataKey="accumulated" 
                    stroke="var(--primary-color)"
                    fill="var(--primary-color)"
                    fillOpacity={0.2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="var(--text-secondary)"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="overBudget"
                    stroke="var(--error-color)"
                    fill="var(--error-color)"
                    fillOpacity={0.3}
                  />
                </ComposedChart>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;