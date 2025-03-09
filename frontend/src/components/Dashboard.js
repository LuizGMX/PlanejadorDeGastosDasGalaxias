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
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  // Lista de anos para o filtro (até 2050)
  const years = [
    { value: 'all', label: 'Todos' },
    ...Array.from(
      { length: 2050 - new Date().getFullYear() + 1 },
      (_, i) => ({ 
        value: new Date().getFullYear() + i,
        label: (new Date().getFullYear() + i).toString()
      })
    )
  ];

  // Lista de meses para o filtro
  const months = [
    { value: 'all', label: 'Todos' },
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
        const queryParams = new URLSearchParams({
          month: filters.month === 'all' ? 'all' : filters.month,
          year: filters.year === 'all' ? 'all' : filters.year
        }).toString();
        
        const response = await fetch(`/api/dashboard?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
        }

        const responseData = await response.json();
        if (responseData.message && responseData.suggestion) {
          setNoExpensesMessage({ 
            message: responseData.message, 
            suggestion: responseData.suggestion 
          });
        } else {
          setNoExpensesMessage(null);
        }
        setData(responseData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleChartExpand = (chartId) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  const renderChart = (chartId, title, chartComponent) => {
    const isExpanded = expandedChart === chartId;
    return (
      <div 
        className={`${styles.chartContainer} ${isExpanded ? styles.expanded : ''}`}
        onClick={() => handleChartExpand(chartId)}
      >
        <div className={styles.chartHeader}>
          <h3>{title}</h3>
          <button className={styles.expandButton}>
            {isExpanded ? 'Minimizar' : 'Expandir'}
          </button>
        </div>
        <ResponsiveContainer width="100%" height={isExpanded ? 600 : 300}>
          {chartComponent}
        </ResponsiveContainer>
      </div>
    );
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
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear()
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
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              className={styles.filterSelect}
            >
              {years.map(year => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
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
                  <strong>{formatCurrency(data.budget_info.total_spent)}</strong>
                </div>
                <div className={styles.budgetStat}>
                  <span>Restante:</span>
                  <strong>{formatCurrency(data.budget_info.remaining_budget)}</strong>
                </div>
                {data.budget_info.remaining_days > 0 && (
                  <div className={styles.budgetStat}>
                    <span>Sugestão de gasto diário:</span>
                    <strong>{formatCurrency(data.budget_info.suggested_daily_spend)}</strong>
                  </div>
                )}
              </div>
              <div className={styles.budgetProgressBar}>
                <div 
                  className={styles.budgetProgress}
                  style={{ width: `${Math.min(data.budget_info.percentage_spent, 100)}%` }}
                />
                <span>{data.budget_info.percentage_spent.toFixed(1)}% utilizado</span>
              </div>
            </div>
          )}

          {data.expenses_by_category && data.expenses_by_category.length > 0 && (
            <div className={styles.chartsGrid}>
              {renderChart('timeline', 'Gastos ao Longo do Tempo',
                <LineChart data={data.expenses_by_date}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date"
                    tick={{ fill: 'var(--text-color)' }}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
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
                    formatter={(value) => <span style={{ color: 'var(--text-color)' }}>Total Gasto</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="var(--primary-color)" 
                    strokeWidth={2}
                  />
                </LineChart>
              )}

              {renderChart('categories', 'Gastos por Categoria',
                <PieChart>
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
                <BarChart data={data.expenses_by_bank}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="bank_name" 
                    tick={{ fill: 'var(--text-color)' }}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
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
                    formatter={(value) => <span style={{ color: 'var(--text-color)' }}>Total por Banco</span>}
                  />
                  <Bar dataKey="total" fill="var(--primary-color)">
                    {data.expenses_by_bank.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}

              {renderChart('comparison', 'Comparativo de Gastos',
                <BarChart data={data.expenses_by_category}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="category_name" 
                    tick={{ fill: 'var(--text-color)' }}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
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
                    formatter={(value) => <span style={{ color: 'var(--text-color)' }}>{value}</span>}
                  />
                  <Bar dataKey="total" fill="var(--primary-color)">
                    {data.expenses_by_category.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;