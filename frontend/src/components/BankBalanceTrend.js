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
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import styles from '../styles/dashboard.module.css';

const BankBalanceTrend = ({ showTitle = true, showControls = true, height = 300, containerStyle = {} }) => {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    fetchTrendData();
  }, [months]);

  const fetchTrendData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/dashboard/bank-balance-trend?months=${months}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dados de tendência');
      }

      const jsonData = await response.json();
      setData(jsonData);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar dados de tendência');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div>Nenhum dado encontrado</div>;

  return (
    <div style={containerStyle}>
      {showTitle && <h3>Tendência de Saldo Bancário</h3>}
      {showControls && (
        <div className={styles.controls}>
          <label>
            Período:
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
              <option value={36}>36 meses</option>
            </select>
          </label>
        </div>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart data={data.projectionData} margin={{ top: 10, right: 30, left: 80, bottom: 20 }}>
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
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              formatter={(value, name) => {
                switch (name) {
                  case 'balance':
                    return [formatCurrency(value), 'Saldo'];
                  case 'expenses':
                    return [formatCurrency(value), 'Despesas'];
                  case 'incomes':
                    return [formatCurrency(value), 'Receitas'];
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
            <Legend
              formatter={(value) => {
                switch (value) {
                  case 'balance':
                    return <span style={{ color: 'var(--text-color)' }}>Saldo</span>;
                  case 'expenses':
                    return <span style={{ color: 'var(--text-color)' }}>Despesas</span>;
                  case 'incomes':
                    return <span style={{ color: 'var(--text-color)' }}>Receitas</span>;
                  default:
                    return <span style={{ color: 'var(--text-color)' }}>{value}</span>;
                }
              }}
            />
            <Line
              dataKey="incomes"
              name="Receitas"
              stroke="var(--success-color)"
              dot={{ fill: 'var(--success-color)', r: 4 }}
              activeDot={{ r: 6, fill: 'var(--success-color)' }}
              isAnimationActive={false}
              connectNulls={true}
              strokeWidth={2}
            />
            <Line
              dataKey="expenses"
              name="Despesas"
              stroke="var(--error-color)"
              dot={{ fill: 'var(--error-color)', r: 4 }}
              activeDot={{ r: 6, fill: 'var(--error-color)' }}
              isAnimationActive={false}
              connectNulls={true}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="rgb(0, 187, 249)"
              strokeWidth={2}
              dot={{ fill: 'rgb(0, 187, 249)', r: 4 }}
              activeDot={{ r: 6, fill: 'rgb(0, 187, 249)' }}
              isAnimationActive={false}
              connectNulls={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span>Total de Receitas Projetadas:</span>
          <strong>{formatCurrency(data.summary.totalProjectedIncomes)}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Total de Despesas Projetadas:</span>
          <strong>{formatCurrency(data.summary.totalProjectedExpenses)}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Saldo Final Projetado:</span>
          <strong className={data.summary.finalBalance >= 0 ? styles.positive : styles.negative}>
            {formatCurrency(data.summary.finalBalance)}
          </strong>
        </div>
      </div>
    </div>
  );
};

export default BankBalanceTrend; 