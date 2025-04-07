import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../utils/formatters';
import styles from '../../styles/mobile/dataTable.mobile.css';

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
  error
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

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

  if (!expenses || expenses.length === 0) {
    return (
      <div className={styles.noDataContainer}>
        <div className={styles.noDataIcon}>📝</div>
        <h3 className={styles.noDataMessage}>Nenhuma despesa encontrada</h3>
        <p className={styles.noDataSuggestion}>
          Comece adicionando sua primeira despesa clicando no botão abaixo
        </p>
        <div className={styles.noDataActions}>
          <button className={styles.primaryButton} onClick={onAdd}>
            <FiPlus /> Adicionar Despesa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Despesas</h1>
        <button className={styles.addButton} onClick={onAdd}>
          <FiPlus /> Adicionar
        </button>
      </div>

      <div className={styles.dataContainer}>
        <div className={styles.filtersContainer}>
          <div className={styles.filterToggleButton} onClick={toggleFilters}>
            <FiFilter />
            <span>Filtros</span>
          </div>

          <div className={showFilters ? styles.filtersExpanded : styles.filtersCollapsed}>
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
            </div>
            {/* Adicione mais filtros aqui conforme necessário */}
          </div>
        </div>

        <div className={styles.mobileCardView}>
          {expenses.map((expense) => (
            <div key={expense.id} className={styles.mobileCard}>
              <div className={styles.mobileCardHeader}>
                <h3 className={styles.mobileCardTitle}>{expense.description}</h3>
                <span className={styles.mobileCardAmount}>
                  {formatCurrency(expense.amount)}
                </span>
              </div>

              <div className={styles.mobileCardDetails}>
                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Data:</span>
                  <span className={styles.mobileCardValue}>
                    {formatDate(expense.date)}
                  </span>
                </div>

                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Categoria:</span>
                  <span className={styles.mobileCardValue}>
                    {expense.category}
                  </span>
                </div>

                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Método:</span>
                  <span className={styles.mobileCardValue}>
                    {expense.paymentMethod}
                  </span>
                </div>

                {expense.installments > 1 && (
                  <div className={styles.mobileCardDetail}>
                    <span className={styles.mobileCardLabel}>Parcelas:</span>
                    <span className={styles.mobileCardValue}>
                      {expense.installments}x
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.mobileCardActions}>
                <div className={styles.mobileCardType}>
                  <span className={styles.typeStatus}>
                    {expense.type === 'fixed' ? 'Fixa' : 'Única'}
                  </span>
                </div>
                <div className={styles.mobileCardActionButtons}>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileExpenses; 