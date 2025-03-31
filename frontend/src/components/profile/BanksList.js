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

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const [banksResponse, favoritesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/banks`),
          fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
          })
        ]);
        if (!banksResponse.ok || !favoritesResponse.ok) {
          throw new Error('Erro ao carregar bancos');
        }
        const [allBanks, favorites] = await Promise.all([
          banksResponse.json(),
          favoritesResponse.json()
        ]);
        setBanks(allBanks);
        setSelectedBanks(favorites.map(bank => bank.id));
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      }
    };
    fetchBanks();
  }, [auth.token]);

  const selectBank = useCallback(async (bankId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          bank_id: bankId,
          is_active: !selectedBanks.includes(bankId)
        })
      });
      if (!response.ok) throw new Error('Erro ao atualizar bancos favoritos');
      setSelectedBanks(prev =>
        prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
      );
      setMessage({ type: 'success', text: 'Favoritos atualizados!' });
    } catch (error) {
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
          Selecione os bancos que você utiliza para gerenciar seus gastos.
        </p>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar banco..."
            value={bankSearch}
            onChange={(e) => setBankSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.banksGrid}>
          {filteredBanks.length > 0 ? (
            filteredBanks.map(bank => renderBankCard(bank, selectedBanks.includes(bank.id)))
          ) : (
            <p className={styles.emptyMessage}>Nenhum banco encontrado com esse nome.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanksList; 