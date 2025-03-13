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
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `${(value / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
    } else if (absValue >= 1000) {
      return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
    }
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatFullCurrency = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `R$ ${(value / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} milhões`;
    } else if (absValue >= 1000) {
      return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    }
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
    <div style={{ 
      ...containerStyle,
      padding: '20px',
      backgroundColor: 'var(--background)',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px'
    }}>
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

<div className={styles.summary} style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '20px',
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>Receitas Projetadas</span>
          <strong style={{ color: 'var(--success-color)', fontSize: '1.2em' }}>
            {formatFullCurrency(data.summary.totalProjectedIncomes)}
          </strong>
        </div>
        <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>Despesas Projetadas</span>
          <strong style={{ color: 'var(--error-color)', fontSize: '1.2em' }}>
            {formatFullCurrency(data.summary.totalProjectedExpenses)}
          </strong>
        </div>
        <div className={styles.summaryItem} style={{ textAlign: 'center' }}>
          <span style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>Saldo Final</span>
          <strong style={{ 
            color: data.summary.finalBalance >= 0 ? 'var(--success-color)' : 'var(--error-color)', 
            fontSize: '1.2em'
          }}>
            {formatFullCurrency(data.summary.finalBalance)}
          </strong>
        </div>
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart 
            data={data.projectionData} 
            margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
            style={{ backgroundColor: 'var(--card-background)', padding: '20px', borderRadius: '8px' }}
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
              tickFormatter={(value) => `${formatCurrency(value)}`}
              tick={{ fill: 'var(--text-color)' }}
              width={80}
              domain={[0, 'dataMax']}
              ticks={(() => {
                // Pega todos os valores únicos do dataset
                const allValues = [...new Set(
                  data.projectionData.flatMap(d => [d.balance, d.expenses, d.incomes])
                    .filter(v => v !== null && v !== undefined)
                )];

                // Encontra o maior valor
                const maxValue = Math.max(...allValues);
                
                // Calcula o ponto médio para x=0
                const midPoint = maxValue / 2;

                // Pega todos os pontos de início das séries
                const startPoints = [
                  data.projectionData[0]?.balance,
                  data.projectionData[0]?.expenses,
                  data.projectionData[0]?.incomes
                ].filter(v => v !== null && v !== undefined);

                // Combina todos os pontos necessários
                const points = [
                  maxValue, // Maior valor sempre primeiro
                  ...startPoints, // Pontos de início das séries
                  midPoint // Ponto médio em x=0
                ];

                // Remove duplicatas e ordena em ordem decrescente
                return [...new Set(points)].sort((a, b) => b - a);
              })()}
            />
            <Tooltip
              formatter={(value, name) => {
                const formattedValue = formatFullCurrency(value);
                switch (name) {
                  case 'balance':
                    return [formattedValue, 'Saldo'];
                  case 'expenses':
                    return [formattedValue, 'Despesas'];
                  case 'incomes':
                    return [formattedValue, 'Receitas'];
                  default:
                    return [formattedValue, name];
                }
              }}
              contentStyle={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                padding: '10px'
              }}
              labelFormatter={formatDate}
              labelStyle={{ color: 'var(--text-color)', marginBottom: '5px' }}
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
    </div>
  );
};

export default BankBalanceTrend; 