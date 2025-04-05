import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenseForm.module.css';
import LogoutButton from './LogoutButton';
import CurrencyInput from 'react-currency-input-field';

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category_id: '',
    bank_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    has_installments: false,
    current_installment: '',
    total_installments: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Iniciando busca de dados...');
        
        // Obter um token válido, tentando primeiro o contexto e depois localStorage
        let token = auth.token;
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage...');
          token = localStorage.getItem('token');
          if (!token) {
            console.error('Nenhum token de autenticação encontrado');
            navigate('/login');
            return;
          }
        }
        
        const categoriesResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/expenses/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Capturar o conteúdo da resposta como texto
        const responseText = await categoriesResponse.text();
        
        // Verificar se a resposta parece ser HTML (erro 502)
        if (responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta contém HTML. Possível erro 502 Bad Gateway.');
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        if (!categoriesResponse.ok) {
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.message || 'Erro ao carregar categorias');
          } catch (jsonError) {
            throw new Error('Erro ao carregar categorias');
          }
        }
        
        // Parsear o JSON manualmente
        let categoriesData;
        try {
          categoriesData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        setCategories(categoriesData);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Erro desconhecido ao carregar dados.');
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.description || !formData.amount || !formData.category_id ||
        !formData.bank_id) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      if (formData.has_installments &&
        (!formData.current_installment || !formData.total_installments)) {
        throw new Error('Por favor, preencha os campos de parcelas');
      }

      const dataToSend = {
        ...formData,
        amount: parseFloat(formData.amount.replace('R$', '').replace(',', '.').trim())
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.API_PREFIX ? `/${process.env.API_PREFIX}` : ''}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar despesa');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={styles.pageContainer}>
      <LogoutButton />
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount">Valor</label>
          <CurrencyInput
            name="amount"
            id="amount"
            placeholder="R$ 0,00"
            decimalsLimit={2}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            value={formData.amount}
            onValueChange={(value) => {
              // Converte o valor para número antes de salvar
              const numericValue = value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : '';
              setFormData(prev => ({ ...prev, amount: numericValue }));
            }}
            className={styles.input}
            required
          />
        </div>

        <button type="submit" className={styles.button}>Salvar Despesa</button>
      </form>
    </div>
  );
};

export default ExpenseForm;