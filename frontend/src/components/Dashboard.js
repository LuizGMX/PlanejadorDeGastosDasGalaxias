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
  const [data, setData] = useState({
    expenses_by_category: [],
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

          {data.expenses_by_category && data.expenses_by_category.length > 0 && (
            <div className={styles.chartsGrid}>
              {/* Gráfico de Pizza: Distribuição por Categoria */}
              <div className={styles.chartContainer}>
                <h3>Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
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
                      formatter={(value) => formatCurrency(value)}
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
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Barras: Gastos por Categoria */}
              <div className={styles.chartContainer}>
                <h3>Comparativo de Gastos</h3>
                <ResponsiveContainer width="100%" height={300}>
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
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Linha: Evolução de Gastos */}
              <div className={styles.chartContainer}>
                <h3>Evolução de Gastos</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.expenses_by_category}>
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
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="var(--primary-color)" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Área: Distribuição Acumulada */}
              <div className={styles.chartContainer}>
                <h3>Distribuição Acumulada</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.expenses_by_category}>
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
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      fill="var(--primary-color)" 
                      stroke="var(--hover-color)"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;