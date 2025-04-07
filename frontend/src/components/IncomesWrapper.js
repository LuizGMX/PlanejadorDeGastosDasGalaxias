import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Income from './Income';
import MobileIncomes from './mobile/MobileIncomes';

const IncomesWrapper = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [filters, setFilters] = useState({
    months: [new Date().getMonth() + 1],
    years: [new Date().getFullYear()],
    description: '',
    category_id: '',
    is_recurring: ''
  });

  // Função para verificar se a tela é mobile
  const isMobileView = () => {
    return window.innerWidth <= 768;
  };

  // Estado para controlar se é mobile
  const [isMobile, setIsMobile] = useState(isMobileView());
  
  // Efeito para monitorar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileView());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Funções para manipular receitas
  const handleAddIncome = () => {
    navigate('/add-income');
  };

  const handleEditIncome = (income) => {
    navigate(`/incomes/edit/${income.id}`);
  };

  const handleDeleteIncome = (income) => {
    setIncomeToDelete(income);
    setShowDeleteModal(true);
  };

  const handleSearch = (term) => {
    setFilters(prev => ({ ...prev, description: term }));
  };

  const handleFilter = () => {
    // Implementar lógica de filtro
  };

  const handleSelectIncome = (id) => {
    setSelectedIncomes(prev => {
      if (prev.includes(id)) {
        return prev.filter(incId => incId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedIncomes.length === incomes.length) {
      setSelectedIncomes([]);
    } else {
      setSelectedIncomes(incomes.map(inc => inc.id));
    }
  };

  // Efeito para carregar dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar receitas
        const incomesResponse = await fetch('/api/incomes', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!incomesResponse.ok) {
          throw new Error('Erro ao carregar receitas');
        }
        
        const incomesData = await incomesResponse.json();
        setIncomes(incomesData);

        // Buscar categorias
        const categoriesResponse = await fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!categoriesResponse.ok) {
          throw new Error('Erro ao carregar categorias');
        }
        
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Buscar bancos
        const banksResponse = await fetch('/api/banks', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!banksResponse.ok) {
          throw new Error('Erro ao carregar bancos');
        }
        
        const banksData = await banksResponse.json();
        setBanks(banksData);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  // Renderização condicional baseada no dispositivo
  return isMobile ? (
    <MobileIncomes
      incomes={incomes}
      onEdit={handleEditIncome}
      onDelete={handleDeleteIncome}
      onAdd={handleAddIncome}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedIncomes={selectedIncomes}
      onSelectIncome={handleSelectIncome}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
    />
  ) : (
    <Income
      incomes={incomes}
      onEdit={handleEditIncome}
      onDelete={handleDeleteIncome}
      onAdd={handleAddIncome}
      onFilter={handleFilter}
      onSearch={handleSearch}
      selectedIncomes={selectedIncomes}
      onSelectIncome={handleSelectIncome}
      onSelectAll={handleSelectAll}
      loading={loading}
      error={error}
    />
  );
};

export default IncomesWrapper; 