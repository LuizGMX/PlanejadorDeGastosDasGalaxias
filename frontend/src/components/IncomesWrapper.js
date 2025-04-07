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
        // Implementar lógica para buscar receitas, categorias e bancos
        // Por enquanto, vamos apenas simular um carregamento
        setTimeout(() => {
          setIncomes([]);
          setCategories([]);
          setBanks([]);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Erro ao carregar dados: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  // Renderiza o componente apropriado com base no tamanho da tela
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
    <Income />
  );
};

export default IncomesWrapper; 