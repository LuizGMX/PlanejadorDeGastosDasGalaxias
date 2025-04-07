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
    // Garantir que incomes seja um array
    const safeIncomes = Array.isArray(incomes) ? incomes : [];
    
    if (selectedIncomes.length === safeIncomes.length) {
      setSelectedIncomes([]);
    } else {
      setSelectedIncomes(safeIncomes.map(inc => inc.id));
    }
  };

  // Efeito para carregar dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Iniciando busca de receitas...');
        // Buscar receitas
        const incomesResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        console.log('Resposta da API de receitas:', {
          status: incomesResponse.status,
          ok: incomesResponse.ok,
          statusText: incomesResponse.statusText
        });
        
        if (!incomesResponse.ok) {
          throw new Error('Erro ao carregar receitas');
        }
        
        const incomesData = await incomesResponse.json();
        console.log('Dados de receitas recebidos:', {
          type: typeof incomesData,
          isArray: Array.isArray(incomesData),
          length: incomesData?.length,
          data: incomesData
        });
        
        // Extrair os dados de receitas do objeto retornado
        let extractedIncomes = [];
        
        // Verificar se é um objeto e tem uma propriedade que contém os dados
        if (typeof incomesData === 'object' && !Array.isArray(incomesData)) {
          // Verificar propriedades comuns que podem conter os dados
          if (incomesData.data && Array.isArray(incomesData.data)) {
            extractedIncomes = incomesData.data;
          } else if (incomesData.incomes && Array.isArray(incomesData.incomes)) {
            extractedIncomes = incomesData.incomes;
          } else if (incomesData.items && Array.isArray(incomesData.items)) {
            extractedIncomes = incomesData.items;
          } else if (incomesData.records && Array.isArray(incomesData.records)) {
            extractedIncomes = incomesData.records;
          } else {
            // Tentar encontrar qualquer propriedade que seja um array
            for (const key in incomesData) {
              if (Array.isArray(incomesData[key])) {
                extractedIncomes = incomesData[key];
                console.log(`Encontrado array na propriedade '${key}'`);
                break;
              }
            }
          }
        } else if (Array.isArray(incomesData)) {
          extractedIncomes = incomesData;
        }
        
        console.log('Receitas extraídas:', {
          length: extractedIncomes.length,
          data: extractedIncomes
        });
        
        setIncomes(extractedIncomes);

        // Buscar categorias
        const categoriesResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/categories`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!categoriesResponse.ok) {
          throw new Error('Erro ao carregar categorias');
        }
        
        const categoriesData = await categoriesResponse.json();
        console.log('Dados de categorias recebidos:', {
          type: typeof categoriesData,
          isArray: Array.isArray(categoriesData),
          data: categoriesData
        });
        
        // Extrair os dados de categorias do objeto retornado
        let extractedCategories = [];
        
        if (typeof categoriesData === 'object' && !Array.isArray(categoriesData)) {
          if (categoriesData.data && Array.isArray(categoriesData.data)) {
            extractedCategories = categoriesData.data;
          } else if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
            extractedCategories = categoriesData.categories;
          } else if (categoriesData.items && Array.isArray(categoriesData.items)) {
            extractedCategories = categoriesData.items;
          } else {
            // Tentar encontrar qualquer propriedade que seja um array
            for (const key in categoriesData) {
              if (Array.isArray(categoriesData[key])) {
                extractedCategories = categoriesData[key];
                console.log(`Encontrado array de categorias na propriedade '${key}'`);
                break;
              }
            }
          }
        } else if (Array.isArray(categoriesData)) {
          extractedCategories = categoriesData;
        }
        
        console.log('Categorias extraídas:', {
          length: extractedCategories.length,
          data: extractedCategories
        });
        
        setCategories(extractedCategories);

        // Buscar bancos
        const banksResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        
        if (!banksResponse.ok) {
          throw new Error('Erro ao carregar bancos');
        }
        
        const banksData = await banksResponse.json();
        console.log('Dados de bancos recebidos:', {
          type: typeof banksData,
          isArray: Array.isArray(banksData),
          data: banksData
        });
        
        // Extrair os dados de bancos do objeto retornado
        let extractedBanks = [];
        
        if (typeof banksData === 'object' && !Array.isArray(banksData)) {
          if (banksData.data && Array.isArray(banksData.data)) {
            extractedBanks = banksData.data;
          } else if (banksData.banks && Array.isArray(banksData.banks)) {
            extractedBanks = banksData.banks;
          } else if (banksData.items && Array.isArray(banksData.items)) {
            extractedBanks = banksData.items;
          } else {
            // Tentar encontrar qualquer propriedade que seja um array
            for (const key in banksData) {
              if (Array.isArray(banksData[key])) {
                extractedBanks = banksData[key];
                console.log(`Encontrado array de bancos na propriedade '${key}'`);
                break;
              }
            }
          }
        } else if (Array.isArray(banksData)) {
          extractedBanks = banksData;
        }
        
        console.log('Bancos extraídos:', {
          length: extractedBanks.length,
          data: extractedBanks
        });
        
        setBanks(extractedBanks);

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error.message);
        // Garantir que incomes seja um array vazio em caso de erro
        setIncomes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  // Log do estado antes da renderização
  console.log('IncomesWrapper render:', {
    incomesLength: incomes.length,
    loading,
    error,
    isMobile
  });

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