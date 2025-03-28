import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/shared.module.css';
import { BsBank2 } from 'react-icons/bs';

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

  return (
    <div className={styles.banksSection}>
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
        {filteredBanks.map(bank => (
          <div
            key={bank.id}
            className={`${styles.bankCard} ${selectedBanks.includes(bank.id) ? styles.selected : ''}`}
            onClick={() => selectBank(bank.id)}
          >
            <div className={styles.bankCardContent}>
              <BsBank2 className={styles.bankIcon} />
              <div className={styles.bankInfo}>
                <span className={styles.bankName}>{bank.name}</span>
              </div>
              <div className={styles.bankStatus}>
                {selectedBanks.includes(bank.id) ? '✓' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BanksList; 