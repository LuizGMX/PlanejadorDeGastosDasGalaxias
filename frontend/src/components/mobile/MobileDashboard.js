import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import styles from '../../styles/mobile/dashboard.mobile.css';
import { FaCalendarAlt, FaChartLine, FaPlus, FaChevronDown, FaChevronRight, FaSearch, FaFilter } from 'react-icons/fa';
import { 
  BsPencil,
  BsEye,
  BsTrash,
  BsBank2,
  BsRepeat,
  BsCurrencyDollar,
  BsX,
  BsCheckAll,
  BsCheck2,
  BsFolderSymlink,
  BsListCheck,
  BsChevronDown,
  BsChevronUp,
  BsArrowClockwise
} from 'react-icons/bs';
import DateRangePicker from '../DateRangePicker';

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedCards, setExpandedCards] = useState({});

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para formatar porcentagem
  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let queryParams = '';
        
        if (selectedPeriod === 'current') {
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          queryParams = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        } else if (selectedPeriod === 'custom' && customDateRange) {
          queryParams = `?startDate=${customDateRange.startNormalized}&endDate=${customDateRange.endNormalized}`;
        }

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_PREFIX}/dashboard${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
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
  }, [auth.token, selectedPeriod, customDateRange]);

  const handleDateRangeSelect = (dateRange) => {
    setCustomDateRange(dateRange);
    setSelectedPeriod('custom');
    setShowDateRangePicker(false);
  };

  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Renderiza o card de resumo financeiro
  const renderSummaryCard = () => {
    if (!data) return null;

    const { total_incomes, total_expenses, balance } = data;

    return (
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <h3>Resumo Financeiro</h3>
          <span className={styles.periodBadge}>
            {selectedPeriod === 'current' ? 'Mês Atual' : 'Período Personalizado'}
          </span>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Receitas</span>
            <span className={`${styles.summaryValue} ${styles.income}`}>
              {formatCurrency(total_incomes)}
            </span>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Despesas</span>
            <span className={`${styles.summaryValue} ${styles.expense}`}>
              {formatCurrency(total_expenses)}
            </span>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Saldo</span>
            <span className={`${styles.summaryValue} ${balance >= 0 ? styles.positive : styles.negative}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Renderiza o card de orçamento
  const renderBudgetCard = () => {
    if (!data?.budget_info) return null;

    const { total_budget, total_spent } = data.budget_info;
    const remainingBudget = Math.max(0, total_budget - total_spent);
    const spentPercentage = (total_spent / total_budget) * 100;

    return (
      <div className={styles.budgetCard}>
        <div className={styles.budgetHeader}>
          <h3>Orçamento</h3>
          <div className={styles.budgetProgress}>
            <div 
              className={styles.progressBar}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
            <span className={styles.progressLabel}>
              {formatPercentage(spentPercentage)}
            </span>
          </div>
        </div>

        <div className={styles.budgetDetails}>
          <div className={styles.budgetItem}>
            <span>Total</span>
            <strong>{formatCurrency(total_budget)}</strong>
          </div>
          <div className={styles.budgetItem}>
            <span>Gasto</span>
            <strong>{formatCurrency(total_spent)}</strong>
          </div>
          <div className={styles.budgetItem}>
            <span>Disponível</span>
            <strong>{formatCurrency(remainingBudget)}</strong>
          </div>
        </div>
      </div>
    );
  };

  // Renderiza o card de categorias
  const renderCategoriesCard = () => {
    if (!data?.expenses_by_category) return null;

    return (
      <div className={styles.categoriesCard}>
        <div className={styles.categoriesHeader}>
          <h3>Principais Categorias</h3>
          <button 
            className={styles.expandButton}
            onClick={() => toggleCardExpansion('categories')}
          >
            {expandedCards.categories ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        <div className={`${styles.categoriesList} ${expandedCards.categories ? styles.expanded : ''}`}>
          {data.expenses_by_category.slice(0, expandedCards.categories ? undefined : 3).map((category, index) => (
            <div key={index} className={styles.categoryItem}>
              <div className={styles.categoryInfo}>
                <span className={styles.categoryName}>{category.category_name}</span>
                <span className={styles.categoryAmount}>
                  {formatCurrency(category.total)}
                </span>
              </div>
              <div className={styles.categoryProgressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${(category.total / data.total_expenses) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderiza o card de transações recentes
  const renderRecentTransactionsCard = () => {
    if (!data?.recent_transactions) return null;

    return (
      <div className={styles.transactionsCard}>
        <div className={styles.transactionsHeader}>
          <h3>Transações Recentes</h3>
          <button 
            className={styles.expandButton}
            onClick={() => toggleCardExpansion('transactions')}
          >
            {expandedCards.transactions ? <BsChevronUp /> : <BsChevronDown />}
          </button>
        </div>

        <div className={`${styles.transactionsList} ${expandedCards.transactions ? styles.expanded : ''}`}>
          {data.recent_transactions.slice(0, expandedCards.transactions ? undefined : 5).map((transaction, index) => (
            <div key={index} className={styles.transactionItem}>
              <div className={styles.transactionIcon}>
                {transaction.type === 'income' ? <BsCurrencyDollar /> : <BsBank2 />}
              </div>
              <div className={styles.transactionInfo}>
                <span className={styles.transactionDescription}>
                  {transaction.description}
                </span>
                <span className={styles.transactionDate}>
                  {formatDate(transaction.date)}
                </span>
              </div>
              <span className={`${styles.transactionAmount} ${
                transaction.type === 'income' ? styles.income : styles.expense
              }`}>
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <BsArrowClockwise /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={styles.mobileDashboard}>
      {/* Header com seleção de período */}
      <div className={styles.dashboardHeader}>
        <div className={styles.periodSelector}>
          <button 
            className={styles.periodButton}
            onClick={() => setShowDateRangePicker(true)}
          >
            <FaCalendarAlt />
            <span>
              {selectedPeriod === 'custom' && customDateRange
                ? `${formatDate(customDateRange.start)} - ${formatDate(customDateRange.end)}`
                : 'Mês Atual'
              }
            </span>
            <FaChevronDown />
          </button>
        </div>

        {/* Botões de navegação */}
        <div className={styles.navigationTabs}>
          <button
            className={`${styles.navTab} ${activeSection === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            Visão Geral
          </button>
          <button
            className={`${styles.navTab} ${activeSection === 'transactions' ? styles.active : ''}`}
            onClick={() => setActiveSection('transactions')}
          >
            Transações
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className={styles.dashboardContent}>
        {/* Cards */}
        {renderSummaryCard()}
        {renderBudgetCard()}
        {renderCategoriesCard()}
        {renderRecentTransactionsCard()}
      </div>

      {/* DateRangePicker Modal */}
      {showDateRangePicker && (
        <div className={styles.datePickerModal}>
          <DateRangePicker 
            onDateRangeSelect={handleDateRangeSelect}
            onCancel={() => setShowDateRangePicker(false)}
          />
        </div>
      )}

      {/* Floating Action Button */}
      <div className={styles.fab}>
        <button 
          className={styles.fabButton}
          onClick={() => navigate('/add-expense')}
        >
          <FaPlus />
        </button>
      </div>
    </div>
  );
};

export default MobileDashboard; 