import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import styles from '../../styles/mobile/dataTable.mobile.module.css';
import '../../styles/dataTable.module.css';

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
  const [filteredExpenses, setFilteredExpenses] = useState([]);

  useEffect(() => {
    // Atualizar os dados filtrados quando os expenses mudarem
    filterData();
  }, [expenses, searchTerm]);

  const filterData = () => {
    // Garantir que expenses seja um array
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    
    // Aplicar filtros
    let filtered = safeExpenses;
    
    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.Category?.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.Bank?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredExpenses(filtered);
  };

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

  if (filteredExpenses.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Despesas</h1>
          <button onClick={onAdd} className={styles.addButton}>
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
            </div>
          </div>

          <div className={styles.noDataContainer}>
            <div className={styles.noDataIcon}>📝</div>
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
          </div>
        </div>

        <div className={styles.cardsContainer}>
          {filteredExpenses.map((expense) => (
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
                  <span className={styles.cardValue}>{formatDate(expense.expense_date)}</span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Categoria</span>
                  <span className={styles.cardValue}>
                    {expense.Category?.category_name || '-'}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Método</span>
                  <span className={styles.cardValue}>
                    {expense.payment_method || '-'}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Tipo</span>
                  <span className={`${styles.typeStatus} ${expense.is_recurring ? styles.fixedType : styles.oneTimeType}`}>
                    {expense.is_recurring ? 'Fixa' : expense.has_installments ? 'Parcelada' : 'Única'}
                  </span>
                </div>

                {expense.has_installments && (
                  <div className={styles.cardDetail}>
                    <span className={styles.cardLabel}>Parcelas</span>
                    <span className={styles.cardValue}>
                      {expense.current_installment}/{expense.total_installments}
                    </span>
                  </div>
                )}
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
      </div>
    </div>
  );
};

export default MobileExpenses; 