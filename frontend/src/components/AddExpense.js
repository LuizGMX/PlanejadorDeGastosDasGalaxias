import { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { NumericFormat } from 'react-number-format';
import 'react-datepicker/dist/react-datepicker.css';
import PixIcon from '@mui/icons-material/Pix';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import styles from './AddExpense.module.css';
import Layout from './Layout';

const schema = Yup.object().shape({
  amount: Yup.string().required('Valor é obrigatório').test('is-valid-amount', 'Valor inválido', value => {
    if (!value) return false;
    const number = parseFloat(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return !isNaN(number) && number > 0;
  }),
  description: Yup.string().required('Descrição é obrigatória'),
  payment_method: Yup.string().oneOf(['card', 'pix']).required('Forma de pagamento é obrigatória'),
  credit_card_id: Yup.mixed().when('payment_method', {
    is: 'card',
    then: () => Yup.number().required('Cartão é obrigatório para pagamento com cartão'),
    otherwise: () => Yup.mixed().nullable()
  }),
  bank_name: Yup.string().when('payment_method', {
    is: 'card',
    then: () => Yup.string().required('Nome do banco é obrigatório'),
    otherwise: () => Yup.mixed().nullable()
  }),
  category_id: Yup.number().required('Categoria é obrigatória'),
  has_installments: Yup.boolean(),
  installment_number: Yup.number().when('has_installments', {
    is: true,
    then: () => Yup.number().min(1).required('Número da parcela é obrigatório'),
    otherwise: () => Yup.number().default(1)
  }),
  total_installments: Yup.number().when('has_installments', {
    is: true,
    then: () => Yup.number().min(1).required('Total de parcelas é obrigatório'),
    otherwise: () => Yup.number().default(1)
  })
});

function AddExpense() {
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cardsRes = await axios.get('/api/credit-cards', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        // Filtra os cartões indesejados ao carregar
        const filteredCards = cardsRes.data.filter(card => 
          !['xp visa', 'bb ouro card'].includes(card.card_name.toLowerCase())
        );
        setCards(filteredCards);
        setFilteredCards(filteredCards);

        const categoriesRes = await axios.get('/api/expenses/categories', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error.response?.data || error.message);
      }
    };
    fetchData();
  }, []);

  const handleSearchChange = (e, setFieldValue) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);

    if (value === '') {
      // Filtra os cartões indesejados
      const filteredList = cards.filter(card => 
        !['xp visa', 'bb ouro card'].includes(card.card_name.toLowerCase())
      );
      setFilteredCards(filteredList);
      setFieldValue('credit_card_id', '');
    } else {
      const filtered = cards
        .filter(card => !['xp visa', 'bb ouro card'].includes(card.card_name.toLowerCase()))
        .filter(card => card.bank_name.toLowerCase().includes(value.toLowerCase()));
      setFilteredCards(filtered);
    }
  };

  const handleCardSelect = (cardId, cardName, bankName, setFieldValue) => {
    setFieldValue('credit_card_id', cardId);
    setFieldValue('bank_name', bankName);
    setSearchTerm(cardName);
    setShowDropdown(false);
  };

  const toggleFavorite = async (id, type) => {
    try {
      const endpoint = type === 'card' 
        ? `/api/credit-cards/${id}/toggle-favorite`
        : `/api/expenses/categories/${id}/toggle-favorite`;
      
      await axios.patch(endpoint, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Atualizar a lista após favoritar/desfavoritar
      const fetchData = async () => {
        const cardsRes = await axios.get('/api/credit-cards', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setCards(cardsRes.data);
        setFilteredCards(cardsRes.data);

        const categoriesRes = await axios.get('/api/expenses/categories', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setCategories(categoriesRes.data);
      };
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h2>Adicionar Despesa</h2>
        <Formik
          initialValues={{
            amount: '',
            description: '',
            payment_method: 'card',
            credit_card_id: '',
            bank_name: '',
            category_id: '',
            has_installments: false,
            installment_number: 1,
            total_installments: 1,
            expense_date: new Date(),
          }}
          validationSchema={schema}
          validateOnBlur={false}
          validateOnChange={false}
          onSubmit={async (values) => {
            const cleanedValues = {
              ...values,
              amount: parseFloat(values.amount.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')),
              credit_card_id: values.payment_method === 'pix' ? null : (values.credit_card_id === '' ? null : values.credit_card_id),
            };
            await axios.post('/api/expenses', cleanedValues, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            navigate('/expenses');
          }}
        >
          {({ errors, touched, setFieldValue, values }) => (
            <Form className={styles.form}>
              <Field name="description" placeholder="Descrição" />
              {errors.description ? <div className={styles.error}>{errors.description}</div> : null}
              
              <NumericFormat
                displayType="input"
                value={values.amount}
                onValueChange={({ value }) => {
                  setFieldValue('amount', value);
                }}
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                placeholder="Valor"
                className={styles.searchInput}
                isNumericString={true}
              />
              {errors.amount ? <div className={styles.error}>{errors.amount}</div> : null}

              {/* Campo de Forma de Pagamento */}
              <div className={styles.paymentMethod}>
                <label>Forma de Pagamento:</label>
                <div className={styles.paymentOptions}>
                  <label className={`${styles.paymentOption} ${values.payment_method === 'card' ? styles.selected : ''}`}>
                    <Field type="radio" name="payment_method" value="card" />
                    <CreditCardIcon className={styles.cardIcon} />
                    <span>Cartão</span>
                  </label>
                  <label className={`${styles.paymentOption} ${values.payment_method === 'pix' ? styles.selected : ''}`}>
                    <Field type="radio" name="payment_method" value="pix" />
                    <PixIcon className={styles.pixIcon} />
                    <span>Pix</span>
                  </label>
                </div>
                {errors.payment_method ? <div className={styles.error}>{errors.payment_method}</div> : null}
              </div>

              {/* Campo de busca de cartão (aparece apenas se for "card") */}
              {values.payment_method === 'card' && (
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e, setFieldValue)}
                    placeholder="Digite para buscar um cartão"
                    onFocus={() => setShowDropdown(true)}
                    className={styles.searchInput}
                  />
                  {showDropdown && (
                    <ul className={styles.dropdown}>
                      {filteredCards.map((card) => (
                        <li
                          key={card.id}
                          onClick={() => handleCardSelect(card.id, card.card_name, card.bank_name, setFieldValue)}
                          className={styles.dropdownItem}
                        >
                          <div className={styles.cardInfo}>
                            <AccountBalanceIcon className={styles.bankIcon} />
                            <span>{card.bank_name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(card.id, 'card');
                              }}
                              className={`${styles.favoriteButton} ${card.is_favorite ? styles.active : ''}`}
                              tabIndex="-1"
                            >
                              ★
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors.credit_card_id ? <div className={styles.error}>{errors.credit_card_id}</div> : null}
                </div>
              )}

              <div className={styles.categorySelect}>
                <Field as="select" name="category_id">
                  <option value="">Selecione uma categoria</option>
                  {categories
                    .sort((a, b) => {
                      if (a.is_favorite === b.is_favorite) {
                        return a.category_name.localeCompare(b.category_name);
                      }
                      return b.is_favorite - a.is_favorite;
                    })
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name} {cat.is_favorite ? '⭐' : ''}
                      </option>
                    ))}
                </Field>
                {errors.category_id ? <div className={styles.error}>{errors.category_id}</div> : null}
              </div>
              
              <div className={styles.installmentsSection}>
                <label className={styles.checkboxLabel}>
                  <Field type="checkbox" name="has_installments" />
                  <span>Possui parcelas</span>
                </label>
                
                {values.has_installments && (
                  <div className={styles.installmentsFields}>
                    <Field 
                      name="installment_number" 
                      type="number" 
                      placeholder="Número da Parcela"
                      min="1" 
                    />
                    {errors.installment_number ? <div className={styles.error}>{errors.installment_number}</div> : null}
                    
                    <Field 
                      name="total_installments" 
                      type="number" 
                      placeholder="Total de Parcelas"
                      min="1" 
                    />
                    {errors.total_installments ? <div className={styles.error}>{errors.total_installments}</div> : null}
                  </div>
                )}
              </div>
              
              <DatePicker
                selected={values.expense_date}
                onChange={(date) => setFieldValue('expense_date', date)}
                dateFormat="dd/MM/yyyy"
                className={styles.datePicker}
              />
              <button type="submit">Adicionar</button>
            </Form>
          )}
        </Formik>
      </div>
    </Layout>
  );
}

export default AddExpense;