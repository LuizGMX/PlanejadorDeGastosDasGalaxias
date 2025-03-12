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
    incomes_by_date: [],
    total_expenses: 0,
    total_income: 0,
    budget_info: null,
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
        console.log('Response data:', responseData);

        if (responseData.message && responseData.suggestion) {
          setNoExpensesMessage({ 
            message: responseData.message, 
            suggestion: responseData.suggestion 
          });
        } else {
          setNoExpensesMessage(null);
        }

        // Calculando totais
        const totalExpenses = responseData.expenses_by_date.reduce((sum, day) => sum + day.total, 0);
        const totalIncome = responseData.incomes_by_date.reduce((sum, day) => sum + day.total, 0);
        
        const budget_info = {
          total_income: totalIncome,
          total_spent: totalExpenses,
          balance: totalIncome - totalExpenses,
          percentage_spent: ((totalExpenses / (totalIncome || 1)) * 100),
          remaining_days: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
        };

        // Calculando sugestão de gasto diário se houver dias restantes
        if (budget_info.remaining_days > 0) {
          budget_info.suggested_daily_spend = budget_info.balance / budget_info.remaining_days;
        }

        setData({
          ...responseData,
          total_expenses: totalExpenses,
          total_income: totalIncome,
          budget_info
        });
        
        console.log('Dashboard data:', {
          total_income: totalIncome,
          total_expenses: totalExpenses,
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
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      
      <div className={styles.filters}>
        <div className={styles.modernSelect}>
          <button 
            onClick={() => setOpenFilter(openFilter === 'months' ? null : 'months')}
            className={styles.filterButton}
          >
            Meses
          </button>
          {openFilter === 'months' && (
            <div className={styles.dropdown}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={filters.months.length === months.length}
                  onChange={() => handleFilterChange('months', 'all')}
                />
                Todos
              </label>
              {months.map(month => (
                <label key={month.value} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.months.includes(month.value)}
                    onChange={() => handleFilterChange('months', month.value)}
                  />
                  {month.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modernSelect}>
          <button 
            onClick={() => setOpenFilter(openFilter === 'years' ? null : 'years')}
            className={styles.filterButton}
          >
            Anos
          </button>
          {openFilter === 'years' && (
            <div className={styles.dropdown}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={filters.years.length === years.length}
                  onChange={() => handleFilterChange('years', 'all')}
                />
                Todos
              </label>
              {years.map(year => (
                <label key={year.value} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.years.includes(year.value)}
                    onChange={() => handleFilterChange('years', year.value)}
                  />
                  {year.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <span className={styles.selectedPeriod}>
          Período selecionado: {formatPeriod()}
        </span>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : noExpensesMessage ? (
        <div className={styles.noData}>
          <p>{noExpensesMessage.message}</p>
          <p>{noExpensesMessage.suggestion}</p>
        </div>
      ) : (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <h3>Receitas Totais</h3>
              <p className={styles.income}>{formatCurrency(data.total_income)}</p>
            </div>
            <div className={styles.card}>
              <h3>Despesas Totais</h3>
              <p className={styles.expense}>{formatCurrency(data.total_expenses)}</p>
            </div>
            <div className={styles.card}>
              <h3>Saldo</h3>
              <p className={data.budget_info.balance >= 0 ? styles.income : styles.expense}>
                {formatCurrency(data.budget_info.balance)}
              </p>
            </div>
            <div className={styles.card}>
              <h3>Gasto Diário Sugerido</h3>
              <p>{formatCurrency(data.budget_info.suggested_daily_spend || 0)}</p>
              <small>para os próximos {data.budget_info.remaining_days} dias</small>
            </div>
          </div>

          <div className={styles.charts}>
            <div className={styles.chartContainer}>
              <h3>Fluxo de Caixa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.expenses_by_date}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total" 
                    name="Despesas" 
                    fill="var(--error-color)" 
                    stackId="a"
                  />
                  <Bar 
                    dataKey={(entry) => {
                      const incomeEntry = data.incomes_by_date.find(i => i.date === entry.date);
                      return incomeEntry ? incomeEntry.total : 0;
                    }}
                    name="Receitas"
                    fill="var(--success-color)"
                    stackId="b"
                  />
                  <Line
                    type="monotone"
                    dataKey={(entry) => {
                      const incomeEntry = data.incomes_by_date.find(i => i.date === entry.date);
                      const income = incomeEntry ? incomeEntry.total : 0;
                      return income - entry.total;
                    }}
                    name="Saldo"
                    stroke="var(--primary-color)"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.chartContainer}>
              <h3>Despesas por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.expenses_by_category}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.expenses_by_category.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {data.expenses_by_bank && data.expenses_by_bank.length > 0 && (
              <div className={styles.chartContainer}>
                <h3>Despesas por Banco</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.expenses_by_bank}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bank_name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="total" fill="var(--primary-color)">
                      {data.expenses_by_bank.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;