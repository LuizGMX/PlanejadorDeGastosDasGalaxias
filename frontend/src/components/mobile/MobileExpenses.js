import React, { useState, useEffect, useRef } from 'react';
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
  const initialFilterApplied = useRef(false);

  // Inicializa os filtros com o mês atual se ainda não estiver definido
  useEffect(() => {
    // Temporariamente desabilitado para depuração
    /*
    if (initialFilterApplied.current) return;
    
    console.log('Inicializando filtros');
    
    // Forçar a aplicação do filtro com valores iniciais
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();
    
    console.log(`Aplicando filtro inicial: mês=${thisMonth}, ano=${thisYear}`);
    
    // Aplicar filtro de mês atual como padrão
    onFilter('months', [thisMonth]);
    
    // Aplicar filtro de ano atual como padrão
    setTimeout(() => {
      onFilter('years', [thisYear]);
      initialFilterApplied.current = true;
    }, 100);
    */

    // Durante a depuração, vamos mostrar todos os dados sem filtrar
    console.log('Pulando inicialização automática de filtros para depuração');
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
                  const value = e.target.value;
                  console.log('Filtro mês selecionado:', value);
                  if (value === 'all') {
                    console.log('Enviando "all" para o filtro de meses');
                    onFilter('months', 'all');
                  } else {
                    const parsedValue = parseInt(value, 10);
                    console.log('Enviando array para o filtro de meses:', [parsedValue]);
                    onFilter('months', [parsedValue]);
                  }
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
                  const value = e.target.value;
                  if (value === 'all') {
                    onFilter('years', 'all');
                  } else {
                    onFilter('years', [parseInt(value, 10)]);
                  }
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

        <button 
          className={styles.clearFiltersButton}
          onClick={() => {
            console.log('Limpando todos os filtros');
            // Definir valores de filtro para mostrar todos os dados
            // Temporariamente inativamos o filtro por mês/ano para ver todos os dados
            onFilter('resetAllFilters', true); // Nova ação para resetar todos os filtros
            setSearchTerm('');
            onSearch('');
            setShowFilters(false); // Fechar o painel de filtros
          }}
        >
          Mostrar Todos
        </button>

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
      </div>
    </div>
  );
};

export default MobileExpenses; 