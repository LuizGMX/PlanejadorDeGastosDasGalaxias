import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/shared.module.css';
import { 
  BsBank2, 
  BsCreditCard2Front, 
  BsWallet2, 
  BsCash, 
  BsPiggyBank,
  BsBuilding,
  BsCurrencyDollar,
  BsArrowLeftRight
} from 'react-icons/bs';
import { SiNubank } from 'react-icons/si';
import { BiDollar, BiMoney, BiWallet } from 'react-icons/bi';
import { MdAccountBalance, MdPayments } from 'react-icons/md';
import { FaMoneyBillWave, FaUniversity, FaCreditCard } from 'react-icons/fa';

// Mapeamento de bancos conhecidos para seus respectivos ícones
const BANK_ICONS = {
  'nubank': <SiNubank size={24} style={{ color: "#8A05BE" }} />,
  'nu': <SiNubank size={24} style={{ color: "#8A05BE" }} />,
  'bradesco': <BsBuilding size={24} style={{ color: "#CC092F" }} />,
  'santander': <FaUniversity size={24} style={{ color: "#EC0000" }} />,
  'itau': <MdAccountBalance size={24} style={{ color: "#EC7000" }} />,
  'itaú': <MdAccountBalance size={24} style={{ color: "#EC7000" }} />,
  'caixa': <BsBuilding size={24} style={{ color: "#1C5FAA" }} />,
  'caixa econômica': <BsBuilding size={24} style={{ color: "#1C5FAA" }} />,
  'banco do brasil': <FaUniversity size={24} style={{ color: "#FFEF38" }} />,
  'bb': <FaUniversity size={24} style={{ color: "#FFEF38" }} />,
  'picpay': <BiMoney size={24} style={{ color: "#21C25E" }} />,
  'mercado pago': <BiDollar size={24} style={{ color: "#00B1EA" }} />,
  'paypal': <MdPayments size={24} style={{ color: "#00457C" }} />,
  'dinheiro': <BsCash size={24} style={{ color: "#00FF85" }} />,
  'carteira': <BsWallet2 size={24} style={{ color: "#00FF85" }} />,
  'cartão': <BsCreditCard2Front size={24} style={{ color: "#00FF85" }} />,
  'poupança': <BsPiggyBank size={24} style={{ color: "#00FF85" }} />,
  'inter': <FaMoneyBillWave size={24} style={{ color: "#FF7A00" }} />,
  'c6': <BsCurrencyDollar size={24} style={{ color: "#242424" }} />,
  'next': <BsArrowLeftRight size={24} style={{ color: "#00FF5F" }} />
};

// Função para obter o ícone correspondente ao banco
const getBankIcon = (bankName) => {
  // Converte o nome do banco para minúsculas para comparação
  const name = bankName.toLowerCase();
  
  // Verifica se existe um ícone específico para este banco
  for (const [key, icon] of Object.entries(BANK_ICONS)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  
  // Se não encontrou ícone específico, cria um círculo colorido com as iniciais
  const color = getColorFromBankName(bankName);
  const initials = getInitials(bankName);
  
  return (
    <div 
      className={styles.bankInitials}
      style={{ 
        backgroundColor: color,
        color: '#fff',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px'
      }}
    >
      {initials}
    </div>
  );
};

// Função para gerar iniciais do nome do banco
const getInitials = (bankName) => {
  return bankName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Função para gerar uma cor baseada no nome do banco
const getColorFromBankName = (bankName) => {
  let hash = 0;
  for (let i = 0; i < bankName.length; i++) {
    hash = bankName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 80%, 65%)`;
};

const BanksList = ({ auth, setMessage, setError }) => {
  const [banks, setBanks] = useState([]);
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // Função para buscar bancos com retry
  const fetchBanks = async (retryCount = 0) => {
    const maxRetries = 3;
    setLoading(true);
    setLoadingError(null);

    try {
      // Criar um AbortController com timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 segundos de timeout

      try {
        // Primeiro, tentamos buscar a lista de bancos
        const availableBanksResponse = await fetch(
          `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks`,
          { 
            signal: abortController.signal
          }
        );

        // Se a resposta for 202 (ainda carregando no servidor), esperar e tentar novamente
        if (availableBanksResponse.status === 202) {
          clearTimeout(timeoutId);
          console.log('Servidor ainda está carregando os bancos, tentando novamente em 2 segundos...');
          if (retryCount < maxRetries) {
            setTimeout(() => fetchBanks(retryCount + 1), 2000);
            return;
          } else {
            throw new Error('Servidor demorou muito para carregar os bancos');
          }
        }

        // Se houver erro no servidor
        if (!availableBanksResponse.ok) {
          clearTimeout(timeoutId);
          throw new Error(`Erro ao carregar bancos: ${availableBanksResponse.status}`);
        }

        // Usar um novo AbortController para o segundo request
        const abortController2 = new AbortController();
        const timeoutId2 = setTimeout(() => abortController2.abort(), 15000);

        // Busca dos bancos favoritos do usuário
        const userBanksResponse = await fetch(
          `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/favorites`, 
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            },
            signal: abortController2.signal
          }
        );

        clearTimeout(timeoutId); // Limpar o primeiro timeout
        clearTimeout(timeoutId2); // Limpar o segundo timeout

        if (!userBanksResponse.ok) {
          throw new Error(`Erro ao carregar bancos favoritos: ${userBanksResponse.status}`);
        }

        // Processar as respostas
        const [allBanks, favorites] = await Promise.all([
          availableBanksResponse.json(),
          userBanksResponse.json()
        ]);
        
        setBanks(allBanks);
        
        // Filtrar apenas os bancos ativos da resposta da API
        const activeBankIds = favorites
          .filter(bank => bank.is_active)
          .map(bank => bank.id);
        
        console.log('Bancos ativos recebidos:', activeBankIds);
        setSelectedBanks(activeBankIds);
        setLoading(false);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError; // Re-lançar para o catch externo
      }
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
      
      // Tentar novamente se for um timeout ou erro de rede
      const isTimeoutOrNetworkError = 
        error.name === 'AbortError' || 
        error.name === 'TypeError' || 
        error.message.includes('timeout') ||
        error.message.includes('network');
        
      if (isTimeoutOrNetworkError && retryCount < maxRetries) {
        console.log(`Tentando novamente (${retryCount + 1}/${maxRetries})...`);
        setTimeout(() => fetchBanks(retryCount + 1), 2000);
        return;
      }
      
      setLoadingError(`Não foi possível carregar a lista de bancos. ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, [auth.token]);

  // Função para tentar novamente manualmente
  const handleRetry = () => {
    fetchBanks();
  };

  const selectBank = useCallback(async (bankId) => {
    try {
      // Verificar status atual do banco antes de fazer a chamada à API
      const currentlySelected = selectedBanks.includes(bankId);
      const newStatus = !currentlySelected;
      
      console.log(`Alterando banco ${bankId}: de ${currentlySelected ? 'ativo' : 'inativo'} para ${newStatus ? 'ativo' : 'inativo'}`);
      
      // Atualizar a UI imediatamente para feedback instantâneo
      setSelectedBanks(prev =>
        prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
      );
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/favorites`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          bank_id: bankId,
          is_active: newStatus
        })
      });
      
      if (!response.ok) {
        // Se houver erro, reverter a alteração na UI
        setSelectedBanks(prev =>
          currentlySelected ? [...prev, bankId] : prev.filter(id => id !== bankId)
        );
        throw new Error('Erro ao atualizar bancos favoritos');
      }
      
      // Ler a resposta para confirmar a atualização
      const result = await response.json();
      console.log('Resposta da API:', result);
      
      setMessage({ type: 'success', text: 'Favoritos atualizados!' });
    } catch (error) {
      console.error('Erro ao atualizar favoritos:', error);
      setError('Erro ao atualizar bancos favoritos');
    }
  }, [auth.token, selectedBanks, setMessage, setError]);

  const filteredBanks = banks
    .filter(bank => bank.name.toLowerCase().includes(bankSearch.toLowerCase()))
    .sort((a, b) => {
      const aSel = selectedBanks.includes(a.id);
      const bSel = selectedBanks.includes(b.id);
      return aSel === bSel ? a.name.localeCompare(b.name) : aSel ? -1 : 1;
    });

  const renderBankCard = (bank, isSelected) => {
    return (
      <div
        key={bank.id}
        className={`${styles.bankCard} ${isSelected ? styles.selected : ''}`}
        onClick={() => selectBank(bank.id)}
      >
        <div className={styles.bankCardContent}>
          {/* Ícone à esquerda */}
          <div className={styles.bankIconContainer}>
            {getBankIcon(bank.name)}
          </div>
          
          <div className={styles.bankInfo}>
            <span className={styles.bankName}>{bank.name}</span>
          </div>
          
          <div className={styles.bankStatus}>
            {isSelected && (
              <span className={styles.checkmark}>✓</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2><BsBank2 /> Bancos Favoritos</h2>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.banksDescription}>
          Selecione os bancos que você utiliza para gerenciar seus despesas.
        </p>
        
        {loadingError ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{loadingError}</p>
            <button 
              className={styles.retryButton}
              onClick={handleRetry}
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Tentar Novamente'}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Buscar banco..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className={styles.searchInput}
                disabled={loading}
              />
            </div>
            
            {loading ? (
              <div className={styles.loadingContainer}>
                <p>Carregando lista de bancos...</p>
              </div>
            ) : (
              <div className={styles.banksGrid}>
                {filteredBanks.length > 0 ? (
                  filteredBanks.map(bank => renderBankCard(bank, selectedBanks.includes(bank.id)))
                ) : (
                  <p className={styles.emptyMessage}>Nenhum banco encontrado com esse nome.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BanksList; 