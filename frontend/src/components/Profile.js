import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import maleAvatar from '../assets/male.svg';
import femaleAvatar from '../assets/female.svg';
import styles from './Profile.module.css';

function Profile() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [cards, setCards] = useState([]);
  const [newCard, setNewCard] = useState('');
  const { auth } = useContext(AuthContext);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await axios.get('/api/credit-cards', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const userRes = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setCards(res.data);
      setName(userRes.data.name);
      setAvatar(userRes.data.avatar);
    };
    fetchProfile();
  }, [auth.token]);

  const updateProfile = async () => {
    await axios.put('/api/auth/me', { name, avatar }, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
  };

  const addCard = async () => {
    const res = await axios.post('/api/credit-cards', { card_name: newCard }, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setCards([...cards, res.data]);
    setNewCard('');
  };

  const deleteCard = async (id) => {
    await axios.delete(`/api/credit-cards/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setCards(cards.filter((c) => c.id !== id));
  };

  return (
    <div className={styles.container}>
      <h2>Perfil</h2>
      <div className={styles.section}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        <div className={styles.avatars}>
          <img
            src={maleAvatar}
            alt="Masculino"
            className={avatar === 'male' ? styles.selected : ''}
            onClick={() => setAvatar('male')}
          />
          <img
            src={femaleAvatar}
            alt="Feminino"
            className={avatar === 'female' ? styles.selected : ''}
            onClick={() => setAvatar('female')}
          />
        </div>
        <button onClick={updateProfile}>Salvar</button>
      </div>
      <div className={styles.section}>
        <h3>Cartões de Crédito</h3>
        <input
          value={newCard}
          onChange={(e) => setNewCard(e.target.value)}
          placeholder="Nome do cartão"
        />
        <button onClick={addCard}>Adicionar Cartão</button>
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              {card.card_name} <button onClick={() => deleteCard(card.id)}>Excluir</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Profile;
