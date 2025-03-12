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

        // Calculando informações do orçamento baseado no total_income e net_income
        const totalExpenses = responseData.total_expenses;
        const totalIncome = responseData.budget_info.total_income;
        const netIncome = responseData.budget_info.net_income;
        const totalBudget = responseData.budget_info.total_budget;

        console.log('Orçamento:', {
          totalIncome,
          netIncome,
          totalBudget,
          totalExpenses
        });

        setData(responseData);
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

  const processChartData = (data) => {
    if (!data || !data.expenses) return null;

    // Verifica se há mais de um ano nos dados
    const years = new Set(data.expenses.map(exp => new Date(exp.date).getFullYear()));
    const showByYear = years.size > 1;

    // Dados para o gráfico de linha
    const expensesByPeriod = data.expenses.reduce((acc, expense) => {
      const date = new Date(expense.date);
      const key = showByYear
        ? date.getFullYear().toString()
        : date.toISOString().split('T')[0];

      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += Number(expense.amount);
      return acc;
    }, {});

    // Ordena as chaves cronologicamente
    const sortedKeys = Object.keys(expensesByPeriod).sort();

    const lineChartData = {
      labels: sortedKeys,
      datasets: [{
        label: 'Gastos',
        data: sortedKeys.map(key => expensesByPeriod[key]),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };

    // Configurações específicas para o gráfico de linha
    const lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: showByYear ? 'category' : 'time',
          time: showByYear ? undefined : {
            unit: 'day'
          }
        },
        y: {
          beginAtZero: true
        }
      }
    };

    // Dados para o gráfico de pizza
    const pieChartData = {
      labels: data.categories.map(cat => cat.name),
      datasets: [{
        data: data.categories.map(cat => cat.amount),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }]
    };

    // Configurações específicas para o gráfico de pizza
    const pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    };

    return {
      lineChartData,
      lineChartOptions,
      pieChartData,
      pieChartOptions
    };
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
                      switch (name) {
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
                    switch (value) {
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

          {/* <div className={styles.chartContainer}>
            <div className={styles.lineChart}>
              <h3>Evolução de Gastos</h3>
              {processChartData(data) && (
                <div style={{ height: '400px' }}>
                  <Line data={processChartData(data).lineChartData} options={processChartData(data).lineChartOptions} />
                </div>
              )}
            </div>
            <div className={styles.pieChart}>
              <h3>Gastos por Categoria</h3>
              {processChartData(data) && (
                <div style={{ height: '400px' }}>
                  <Pie data={processChartData(data).pieChartData} options={processChartData(data).pieChartOptions} />
                </div>
              )}
            </div>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default Dashboard;