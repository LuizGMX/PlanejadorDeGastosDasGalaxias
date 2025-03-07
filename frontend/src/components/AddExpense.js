import { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './AddExpense.module.css';

const schema = Yup.object().shape({
  amount: Yup.number().positive().required('Valor é obrigatório'),
  description: Yup.string().required('Descrição é obrigatória'),
  payment_method: Yup.string().oneOf(['card', 'pix']).required('Forma de pagamento é obrigatória'),
  credit_card_id: Yup.number().nullable().when('payment_method', {
    is: 'card',
    then: Yup.number().required('Cartão é obrigatório para pagamento com cartão'),
    otherwise: Yup.number().nullable(),
  }),
  category_id: Yup.number().required('Categoria é obrigatória'),
  installment_number: Yup.number().min(1).required('Número da parcela é obrigatório'),
  total_installments: Yup.number().min(1).required('Total de parcelas é obrigatório'),
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
        setCards(cardsRes.data);
        setFilteredCards(cardsRes.data);

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
      setFilteredCards(cards);
      setFieldValue('credit_card_id', '');
    } else {
      const filtered = cards.filter((card) =>
        card.card_name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCards(filtered);
    }
  };

  const handleCardSelect = (cardId, cardName, setFieldValue) => {
    setFieldValue('credit_card_id', cardId);
    setSearchTerm(cardName);
    setShowDropdown(false);
  };

  return (
    <div className={styles.container}>
      <h2>Adicionar Despesa</h2>
      <Formik
        initialValues={{
          amount: '',
          description: '',
          payment_method: 'card', // Valor padrão
          credit_card_id: '',
          category_id: '',
          installment_number: 1,
          total_installments: 1,
          expense_date: new Date(),
        }}
        validationSchema={schema}
        onSubmit={async (values) => {
          const cleanedValues = {
            ...values,
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
            {errors.description && touched.description ? <div>{errors.description}</div> : null}
            <Field name="amount" type="number" placeholder="Valor" />
            {errors.amount && touched.amount ? <div>{errors.amount}</div> : null}

            {/* Campo de Forma de Pagamento */}
            <div className={styles.paymentMethod}>
              <label>Forma de Pagamento:</label>
              <div>
                <label>
                  <Field type="radio" name="payment_method" value="card" />
                  Cartão
                </label>
                <label>
                  <Field type="radio" name="payment_method" value="pix" />
                  Pix
                </label>
              </div>
              {errors.payment_method && touched.payment_method ? <div>{errors.payment_method}</div> : null}
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
                        onClick={() => handleCardSelect(card.id, card.card_name, setFieldValue)}
                        className={styles.dropdownItem}
                      >
                        {card.card_name}
                      </li>
                    ))}
                  </ul>
                )}
                {errors.credit_card_id && touched.credit_card_id ? <div>{errors.credit_card_id}</div> : null}
              </div>
            )}

            <Field as="select" name="category_id">
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </Field>
            {errors.category_id && touched.category_id ? <div>{errors.category_id}</div> : null}
            <Field name="installment_number" type="number" placeholder="Número da Parcela" />
            {errors.installment_number && touched.installment_number ? <div>{errors.installment_number}</div> : null}
            <Field name="total_installments" type="number" placeholder="Total de Parcelas" />
            {errors.total_installments && touched.total_installments ? <div>{errors.total_installments}</div> : null}
            <DatePicker
              selected={new Date()}
              onChange={(date) => setFieldValue('expense_date', date)}
              dateFormat="dd/MM/yyyy"
            />
            <button type="submit">Adicionar</button>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default AddExpense;