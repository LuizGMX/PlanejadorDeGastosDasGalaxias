import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import styles from '../../styles/mobile/dataTable.mobile.module.css';
import dataTableStyles from '../../styles/dataTable.module.css';

const MobileExpenses = ({ 
  expenses, 
  onEdit, 
  onDelete, 
  onAdd,
  onFilter,
  onSearch,
  selectedExpenses,
  onSelectExpense,
  onSelectAll,
  loading,
  error,
  categories = [],
  banks = [],
  filters = {}
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Inicializa os filtros com o mês atual se ainda não estiver definido
  useEffect(() => {
    if (!filters.months || filters.months.length === 0) {
      onFilter('months', currentMonth);
    }
    if (!filters.years || filters.years.length === 0) {
      onFilter('years', currentYear);
    }
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Componente de filtros que será reutilizado
  const renderFilters = () => (
    <div className={styles.filtersContainer}>
      <div className={styles.filterToggleButton} onClick={toggleFilters}>
        <FiFilter />
        <span>Filtros</span>
      </div>

      <div className={showFilters ? styles.filtersExpanded : styles.filtersCollapsed}>
        <div className={styles.filtersExpandedTitle}>Opções de Filtro</div>
        <div className={styles.filterRow}>
          <div className={styles.searchField}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          {/* Additional filter options */}
          <div className={styles.filterOptions}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Categorias</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => onFilter('category', e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.category_name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Método de Pagamento</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => onFilter('paymentMethod', e.target.value)}
              >
                <option value="all">Todos os métodos</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tipo</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => onFilter('is_recurring', e.target.value)}
              >
                <option value="">Todos os tipos</option>
                <option value="true">Fixas</option>
                <option value="false">Únicas</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Mês</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const currentMonths = filters?.months || [new Date().getMonth() + 1];
                  onFilter('months', value);
                }}
                defaultValue={filters.months?.[0] || currentMonth}
              >
                <option value="all">Todos os meses</option>
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Ano</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  onFilter('years', value);
                }}
                defaultValue={filters.years?.[0] || currentYear}
              >
                <option value="all">Todos os anos</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Carregando despesas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorText}>Erro ao carregar despesas: {error}</div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Despesas</h1>
          <button onClick={onAdd} className={styles.addButton}>
            <FiPlus /> Adicionar
          </button>
        </div>

        <div className={styles.dataContainer}>
          {renderFilters()}

          <div className={styles.noDataContainer}>
            <div className={styles.noDataIcon}>💰</div>
            <h3 className={styles.noDataMessage}>
              {searchTerm ? "Nenhuma despesa encontrada para os filtros selecionados." : "Nenhuma despesa encontrada"}
            </h3>
            <p className={styles.noDataSuggestion}>
              {searchTerm ? "Tente ajustar os filtros ou " : "Comece "}
              adicionando sua primeira despesa
            </p>
            <div className={styles.noDataActions}>
              <button className={styles.primaryButton} onClick={onAdd}>
                <FiPlus /> Adicionar Despesa
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Despesas</h1>
        <button onClick={onAdd} className={styles.addButton}>
          <FiPlus /> Adicionar
        </button>
      </div>

      <div className={styles.dataContainer}>
        {renderFilters()}

        <div className={styles.cardsContainer}>
          {expenses.map((expense) => (
            <div key={expense.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{expense.description}</h3>
                <span className={`${styles.amountBadge} ${styles.expenseAmount}`}>
                  {formatCurrency(expense.amount)}
                </span>
              </div>

              <div className={styles.cardDetails}>
                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Data</span>
                  <span className={styles.cardValue}>{formatDate(expense.date)}</span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Categoria</span>
                  <span className={styles.cardValue}>
                    {expense.Category?.category_name || '-'}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Banco</span>
                  <span className={styles.cardValue}>
                    {expense.Bank?.name || '-'}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Tipo</span>
                  <span className={`${styles.typeStatus} ${expense.is_recurring ? styles.fixedType : styles.oneTimeType}`}>
                    {expense.is_recurring ? 'Fixa' : 'Única'}
                  </span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.editButton}
                  onClick={() => onEdit(expense)}
                >
                  <FiEdit2 />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => onDelete(expense)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          className={styles.clearFiltersButton}
          onClick={() => {
            // Limpar filtros
            onFilter('category', 'all');
            onFilter('paymentMethod', 'all');
            onFilter('is_recurring', '');
            onFilter('months', 'all');
            onFilter('years', 'all');
            setSearchTerm('');
            onSearch('');
          }}
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default MobileExpenses; 