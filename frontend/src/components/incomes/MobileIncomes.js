import React, { useState, useEffect, useRef } from 'react';
import { FiEdit2, FiTrash2, FiFilter, FiSearch, FiPlus } from 'react-icons/fi';
import { BsRepeat, BsCurrencyDollar, BsExclamationTriangle, BsX } from 'react-icons/bs';
import { formatCurrency, formatDate } from '../../utils/formatters';
import styles from '../../styles/mobile/dataTable.mobile.module.css';


const MobileIncomes = ({ 
  incomes, 
  onEdit, 
  onDelete, 
  onAdd,
  onFilter,
  onSearch,
  loading,
  error,
  categories = [],
  banks = [],
  filters = {}
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleDelete = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (deleteOption) => {
    if (incomeToDelete) {
      let queryParams = '';
      if (incomeToDelete.is_recurring) {
        switch (deleteOption) {
          case 'all':
            queryParams = '?delete_all=true';
            break;
          case 'future':
            queryParams = '?delete_future=true';
            break;
          case 'past':
            queryParams = '?delete_past=true';
            break;
          default:
            queryParams = '';
        }
      }
      await onDelete(incomeToDelete, queryParams);
      setShowDeleteModal(false);
      setIncomeToDelete(null);
    }
  };

  // Componente de filtros que será reutilizado
  const renderFilters = () => (
    <div className={styles.filtersContainer}>
      <div className={styles.filterToggleButton} onClick={toggleFilters}>
        <FiFilter />
        <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
      </div>

      <div className={showFilters ? styles.filtersExpanded : styles.filtersCollapsed}>
        <div className={styles.filtersExpandedTitle}>Opções de Filtro</div>
        <div className={styles.filterRow}>
          <div className={styles.searchField}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className={styles.filterOptions}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Mês</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    onFilter('months', []);
                  } else {
                    onFilter('months', [parseInt(value, 10)]);
                  }
                }}
                value={filters.months?.[0]?.toString() || currentMonth.toString()}
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
                    onFilter('years', []);
                  } else {
                    onFilter('years', [parseInt(value, 10)]);
                  }
                }}
                value={filters.years?.[0]?.toString() || currentYear.toString()}
              >
                <option value="all">Todos os anos</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
                <option value={currentYear + 2}>{currentYear + 2}</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Categorias</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => onFilter('category_id', e.target.value)}
                value={filters.category_id || 'all'}
              >
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.category_name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Banco</label>
              <select 
                className={styles.filterSelect}
                onChange={(e) => onFilter('bank_id', e.target.value)}
                value={filters.bank_id || 'all'}
              >
                <option value="all">Todos os bancos</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Tipo</label>
            <select 
              className={styles.filterSelect}
              onChange={(e) => onFilter('is_recurring', e.target.value)}
              value={filters.is_recurring || ''}
            >
              <option value="">Todos os tipos</option>
              <option value="true">Fixas</option>
              <option value="false">Únicas</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

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

  if (incomes.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Receitas</h1>
          <button onClick={onAdd} className={styles.addButton}>
            <FiPlus /> Adicionar
          </button>
        </div>

        <div className={styles.dataContainer}>
          {renderFilters()}

          <div className={styles.noDataContainer}>
            <div className={styles.noDataIcon}>💰</div>
            <h3 className={styles.noDataMessage}>
              {searchTerm ? "Nenhuma receita encontrada para os filtros selecionados." : "Nenhuma receita encontrada"}
            </h3>
            <p className={styles.noDataSuggestion}>
              {searchTerm ? "Tente ajustar os filtros ou " : "Comece "}
              adicionando sua primeira receita
            </p>
            <div className={styles.noDataActions}>
              <button className={styles.primaryButton} onClick={onAdd}>
                <FiPlus /> Adicionar Receita
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
        <h1 className={styles.title}>Receitas</h1>
        <button onClick={onAdd} className={styles.addButton}>
          <FiPlus /> Adicionar
        </button>
      </div>

      <div className={styles.dataContainer}>
        {renderFilters()}

        <div className={styles.cardsContainer}>
          {incomes.map((income) => {
            console.log('Renderizando income:', income);
            return (
            <div key={income.id} className={styles.card} style={{ borderLeftColor: '#00ff85' }}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{income.description}</h3>
                <span className={`${styles.amountBadge} ${styles.incomeAmount}`}>
                  {formatCurrency(income.amount)}
                </span>
              </div>

              <div className={styles.cardDetails}>
                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Data</span>
                  <span className={styles.cardValue}>{formatDate(income.date)}</span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Categoria</span>
                  <span className={styles.cardValue}>
                    {income.Category ? income.Category.category_name : '-'}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Banco</span>
                  <span className={styles.cardValue}>
                    {income.Bank 
                      ? income.Bank.name 
                      : (income.bank 
                        ? income.bank.name 
                        : '-')}
                  </span>
                </div>

                <div className={styles.cardDetail}>
                  <span className={styles.cardLabel}>Tipo</span>
                  <span className={`${styles.typeStatus} ${income.is_recurring ? styles.fixedType : styles.oneTimeType}`}>
                    {income.is_recurring ? (
                      <><BsRepeat size={14} /> Fixa</>
                    ) : (
                      <><BsCurrencyDollar size={14} /> Única</>
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.editButton}
                  onClick={() => onEdit(income)}
                  aria-label="Editar receita"
                >
                  <FiEdit2 />
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(income)}
                  aria-label="Excluir receita"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          )})}
        </div>
      </div>

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <BsExclamationTriangle className={styles.warningIcon} />
              <h3>Confirmar exclusão</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Tem certeza que deseja excluir esta receita?</p>
              <p><strong>{incomeToDelete?.description}</strong></p>
              
              {incomeToDelete?.is_recurring && (
                <div className={styles.modalOptions}>
                  <p className={styles.modalOptionsTitle}>Como deseja excluir esta receita recorrente?</p>
                  <div className={styles.modalOptionButtons}>
                    <button
                      className={styles.optionButton}
                      onClick={() => handleConfirmDelete()}
                    >
                      Apenas esta
                    </button>
                    <button
                      className={styles.optionButton}
                      onClick={() => handleConfirmDelete('all')}
                    >
                      Todas as recorrências
                    </button>
                    <button
                      className={styles.optionButton}
                      onClick={() => handleConfirmDelete('future')}
                    >
                      Esta e próximas
                    </button>
                    <button
                      className={styles.optionButton}
                      onClick={() => handleConfirmDelete('past')}
                    >
                      Esta e anteriores
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowDeleteModal(false)}
              >
                <BsX /> Cancelar
              </button>
              {!incomeToDelete?.is_recurring && (
                <button
                  className={`${styles.primaryButton} ${styles.deleteButton}`}
                  onClick={() => handleConfirmDelete()}
                >
                  <FiTrash2 /> Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileIncomes; 