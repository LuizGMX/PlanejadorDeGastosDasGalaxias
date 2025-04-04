import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import styles from '../styles/dashboard.module.css';

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
      {showTitle && <h3 className={styles.trendChartTitle}>Projeção de Saldo</h3>}
      
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
          <Line
            type="monotone"
            dataKey="receitas"
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
        <div className={styles.trendChartSummaryItem}>
          <span>Receitas Projetados</span>
          <strong className={styles.positive}>
            {formatFullCurrency(data.summary.totalProjectedIncomes)}
          </strong>
        </div>
        <div className={styles.trendChartSummaryItem}>
          <span>Despesas Projetadas</span>
          <strong className={styles.negative}>
            {formatFullCurrency(data.summary.totalProjectedExpenses)}
          </strong>
        </div>
        <div className={styles.trendChartSummaryItem}>
          <span>Saldo Final Projetado</span>
          <strong className={data.summary.finalBalance >= 0 ? styles.positive : styles.negative}>
            {formatFullCurrency(data.summary.finalBalance)}
          </strong>
        </div>
      </div>
    </div>
  );
};

export default BankBalanceTrend; 