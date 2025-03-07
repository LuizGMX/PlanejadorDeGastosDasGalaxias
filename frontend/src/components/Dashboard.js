import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import Layout from './Layout';
import AddIcon from '@mui/icons-material/Add';
import styles from './Dashboard.module.css';

function Dashboard() {
  const [chartData, setChartData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const [motivationalQuote, setMotivationalQuote] = useState('');
  const navigate = useNavigate();

  const motivationalQuotes = [
    "Cada centavo economizado hoje é um passo em direção à liberdade financeira de amanhã.",
    "O controle das finanças é o primeiro passo para conquistar seus sonhos.",
    "Organize suas finanças e veja seus objetivos se tornarem realidade.",
    "Investir em conhecimento financeiro é investir em seu futuro.",
    "Pequenas economias diárias se transformam em grandes conquistas.",
    "O planejamento financeiro é a chave para uma vida mais tranquila.",
    "Cada decisão financeira consciente é uma vitória para seu futuro.",
    "A educação financeira é o melhor investimento que você pode fazer.",
    "Controle suas finanças, controle seu destino.",
    "Organize suas despesas e veja suas oportunidades crescerem."
  ];

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

  const paymentMethods = [
    { value: 'all', label: 'Todos' },
    { value: 'card', label: 'Cartão' },
    { value: 'pix', label: 'PIX' }
  ];

  const chartOptions = {
    chart: {
      type: 'pie',
      background: 'transparent'
    },
    labels: [],
    legend: {
      position: 'right',
      fontSize: '14px',
      labels: {
        colors: '#495057'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    stroke: {
      width: 2,
      colors: ['#fff']
    },
    dataLabels: {
      enabled: true,
      formatter: function(val, opts) {
        return opts.w.config.labels[opts.seriesIndex] + ' (' + val.toFixed(1) + '%)';
      },
      style: {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold'
      },
      dropShadow: {
        enabled: true,
        blur: 3,
        opacity: 0.3
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '0%'
        }
      }
    },
    colors: [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#4BCFB1', '#7E57C2',
      '#26A69A', '#EC407A'
    ],
    tooltip: {
      y: {
        formatter: function(value) {
          return 'R$ ' + value.toFixed(2);
        }
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  };

  const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
  };

  const fetchUserData = async () => {
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
      });
      setUserName(res.data.name);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  const fetchAvailablePeriods = async (year = null) => {
    try {
      const params = year ? { year } : {};
      const res = await axios.get('/api/dashboard/available-periods', {
        params,
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!year) {
        setAvailableYears(res.data.years);
        setSelectedMonth(null);
      } else {
        setAvailableMonths(res.data.months);
      }
    } catch (error) {
      console.error('Erro ao buscar períodos disponíveis:', error);
    }
  };

  useEffect(() => {
    setGreeting(getGreeting());
    setMotivationalQuote(getRandomQuote());
    fetchUserData();
    fetchAvailablePeriods();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchAvailablePeriods(selectedYear);
    } else {
      setAvailableMonths([]);
      setSelectedMonth(null);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchData();
    } else {
      setChartData(null);
    }
  }, [selectedYear, selectedMonth, selectedPaymentMethod]);

  const fetchData = async () => {
    try {
      const params = {
        year: selectedYear,
        month: selectedMonth,
        payment_method: selectedPaymentMethod
      };

      console.log('Iniciando busca de dados com filtros:', params);

      const res = await axios.get('/api/dashboard', {
        params,
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Resposta da API:', res.data);

      const expensesByCategory = res.data.expenses_by_category;

      if (!expensesByCategory || expensesByCategory.length === 0) {
        console.log('Nenhuma despesa encontrada');
        setChartData(null);
        return;
      }

      const total = expensesByCategory.reduce((acc, item) => acc + item.total, 0);
      console.log('Total calculado:', total);

      const series = expensesByCategory.map(item => item.total);
      const labels = expensesByCategory.map(item => item.category_name);

      setChartData({
        options: {
          ...chartOptions,
          labels
        },
        series
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setChartData(null);
    }
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value ? parseInt(e.target.value) : null;
    setSelectedYear(newYear);
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value ? parseInt(e.target.value) : null;
    setSelectedMonth(newMonth);
  };

  const handlePaymentMethodChange = (e) => {
    const newPaymentMethod = e.target.value;
    setSelectedPaymentMethod(newPaymentMethod);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.greetingSection}>
            <h2>{greeting}, {userName}! 👋</h2>
            <p className={styles.motivationalQuote}>{motivationalQuote}</p>
          </div>
          <div className={styles.headerButtons}>
            <Link to="/expenses" className={`${styles.addButton} ${styles.viewButton}`}>
              <span>Ver Todas as Despesas</span>
            </Link>
            <Link to="/add-expense" className={styles.addButton}>
              <AddIcon />
              <span>Adicionar Despesa</span>
            </Link>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Ano:</label>
            <select 
              value={selectedYear || ''}
              onChange={handleYearChange}
              className={styles.select}
            >
              <option value="">Selecione o ano</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Mês:</label>
            <select 
              value={selectedMonth || ''}
              onChange={handleMonthChange}
              className={styles.select}
              disabled={!selectedYear}
            >
              <option value="">Selecione o mês</option>
              {months
                .filter(month => availableMonths.includes(month.value))
                .map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))
              }
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Tipo de Pagamento:</label>
            <select 
              value={selectedPaymentMethod}
              onChange={handlePaymentMethodChange}
              className={styles.select}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.chart}>
          {chartData ? (
            <ReactApexChart
              options={chartData.options}
              series={chartData.series}
              type="pie"
              height="100%"
              width="100%"
            />
          ) : (
            <p className={styles.noData}>
              {!selectedYear 
                ? 'Selecione um ano para começar'
                : !selectedMonth 
                  ? 'Selecione um mês para visualizar as despesas'
                  : 'Nenhuma despesa encontrada para o período selecionado'
              }
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;