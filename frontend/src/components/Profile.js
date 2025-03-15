import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    net_income: '',
    avatar: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar perfil');
        }

        const data = await response.json();
        setFormData(data);
      } catch (err) {
        setError('Erro ao carregar perfil. Por favor, tente novamente.');
      }
    };

    fetchProfile();
  }, [auth.token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar perfil');
      }

      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Erro ao atualizar perfil. Por favor, tente novamente.');
    }
  };

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Meu Perfil</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Renda Líquida</label>
            <input
              type="number"
              name="net_income"
              value={formData.net_income}
              onChange={handleChange}
              className={styles.input}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Avatar</label>
            <select
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="">Selecione um avatar</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.button}>
              Salvar Alterações
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`${styles.button} ${styles.secondary}`}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`${styles.button} ${styles.danger}`}
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
