import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import styles from '../../styles/mobile/dataTable.mobile.module.css';

const MobileIncomes = ({ 
  incomes, 
  onEdit, 
  onDelete, 
  onAdd,
  onFilter,
  onSearch,
  selectedIncomes,
  onSelectIncome,
  onSelectAll,
  loading,
  error
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  console.log('MobileIncomes render:', { 
    incomesType: typeof incomes, 
    isArray: Array.isArray(incomes), 
    incomesLength: incomes?.length,
    loading,
    error,
    incomesData: incomes // Log dos dados completos
  });

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
        <div className={styles.loadingText}>Carregando receitas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorText}>Erro ao carregar receitas: {error}</div>
      </div>
    );
  }

  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  
  // Log após o tratamento dos dados
  console.log('MobileIncomes safeIncomes:', {
    length: safeIncomes.length,
    data: safeIncomes
  });
  
  if (safeIncomes.length === 0) {
    return (
      <div className={styles.noDataContainer}>
        <div className={styles.noDataIcon}>💰</div>
        <h3 className={styles.noDataMessage}>Nenhuma receita encontrada - MOBILE!</h3>
        <p className={styles.noDataSuggestion}>
          Comece adicionando sua primeira receita clicando no botão abaixo
        </p>
        <div className={styles.noDataActions}>
          <button className={styles.primaryButton} onClick={onAdd}>
            <FiPlus /> Adicionar Receita
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Receitas</h1>
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
                  placeholder="Buscar receitas..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.mobileCardView}>
          {safeIncomes.map((income) => (
            <div key={income.id} className={styles.mobileCard}>
              <div className={styles.mobileCardHeader}>
                <h3 className={styles.mobileCardTitle}>{income.description}</h3>
                <span className={styles.mobileCardAmount}>
                  {formatCurrency(income.amount)}
                </span>
              </div>

              <div className={styles.mobileCardDetails}>
                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Data:</span>
                  <span className={styles.mobileCardValue}>
                    {formatDate(income.date)}
                  </span>
                </div>

                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Categoria:</span>
                  <span className={styles.mobileCardValue}>
                    {income.Category?.category_name || '-'}
                  </span>
                </div>

                <div className={styles.mobileCardDetail}>
                  <span className={styles.mobileCardLabel}>Banco:</span>
                  <span className={styles.mobileCardValue}>
                    {income.Bank?.name || '-'}
                  </span>
                </div>

                {income.is_recurring && (
                  <div className={styles.mobileCardDetail}>
                    <span className={styles.mobileCardLabel}>Tipo:</span>
                    <span className={styles.mobileCardValue}>
                      Receita Fixa
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.mobileCardActions}>
                <div className={styles.mobileCardType}>
                  <span className={styles.typeStatus}>
                    {income.is_recurring ? 'Fixa' : 'Única'}
                  </span>
                </div>
                <div className={styles.mobileCardActionButtons}>
                  <button
                    className={styles.editButton}
                    onClick={() => onEdit(income)}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => onDelete(income)}
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

export default MobileIncomes; 