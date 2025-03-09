import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const AddExpense = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    subcategory_id: '',
    payment_method: 'card'
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', {
          headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar categorias');
        setCategories(await response.json());
      } catch {
        setError('Erro ao carregar categorias.');
      }
    };
    fetchCategories();
  }, [auth.token]);

  useEffect(() => {
    if (formData.category_id) {
      const fetchSubcategories = async () => {
        try {
          const response = await fetch(`/api/categories/${formData.category_id}/subcategories`, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
          });
          if (!response.ok) throw new Error('Falha ao carregar subcategorias');
          setSubcategories(await response.json());
        } catch {
          setError('Erro ao carregar subcategorias.');
        }
      };
      fetchSubcategories();
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [formData.category_id, auth.token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Falha ao adicionar despesa');
      setSuccess('Despesa adicionada!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch {
      setError('Erro ao adicionar despesa.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Adicionar Despesa</h1>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input type="text" name="description" value={formData.description} onChange={handleChange} required placeholder="Descrição" className={styles.input} />
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="Valor" className={styles.input} />
          <input type="date" name="date" value={formData.date} onChange={handleChange} required className={styles.input} />
          <select name="category_id" value={formData.category_id} onChange={handleChange} required className={styles.input}>
            <option value="">Selecione uma categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
          </select>
          {subcategories.length > 0 && (
            <select name="subcategory_id" value={formData.subcategory_id} onChange={handleChange} required className={styles.input}>
              <option value="">Selecione uma subcategoria</option>
              {subcategories.map(s => <option key={s.id} value={s.id}>{s.subcategory_name}</option>)}
            </select>
          )}
          <select name="payment_method" value={formData.payment_method} onChange={handleChange} required className={styles.input}>
            <option value="card">Cartão</option>
            <option value="pix">PIX</option>
            <option value="money">Dinheiro</option>
          </select>
          <button type="submit" className={styles.button}>Adicionar</button>
          <button type="button" onClick={() => navigate('/dashboard')} className={`${styles.button} ${styles.secondary}`}>Cancelar</button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;