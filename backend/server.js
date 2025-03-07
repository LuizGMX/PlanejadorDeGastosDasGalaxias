const express = require('express');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(express.json());

// Conexão com MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
  }
);

// Importar modelos
const User = require('./models/user')(sequelize);
const CreditCard = require('./models/creditCard')(sequelize);
const Category = require('./models/category')(sequelize);
const Expense = require('./models/expense')(sequelize);
const VerificationCode = require('./models/verificationCode')(sequelize);

// Relacionamentos
User.hasMany(CreditCard, { foreignKey: 'user_id' });
CreditCard.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Expense, { foreignKey: 'user_id' });
Expense.belongsTo(User, { foreignKey: 'user_id' });
CreditCard.hasMany(Expense, { foreignKey: 'credit_card_id' });
Expense.belongsTo(CreditCard, { foreignKey: 'credit_card_id' });
Expense.belongsTo(Category, { foreignKey: 'category_id' });

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Não autorizado' });
  const user = await User.findOne({ where: { session_token: token } });
  if (!user) return res.status(401).json({ message: 'Não autorizado' });
  req.user = user;
  next();
};

// Rotas
const authRoutes = require('./routes/auth')(User, VerificationCode, sgMail, CreditCard); // Passe CreditCard aqui
app.use('/api/auth', authRoutes);
app.use('/api/expenses', authenticate, require('./routes/expenses')(Expense, CreditCard, Category));
app.use('/api/credit-cards', authenticate, require('./routes/creditCards')(CreditCard));
app.use('/api/dashboard', authenticate, require('./routes/dashboard')(Expense, Category));

// Sincronizar banco de dados e adicionar dados iniciais apenas se necessário
sequelize.sync({force:true}).then(async () => {
  const categoryCount = await Category.count();
  if (categoryCount === 0) {
    await Category.bulkCreate([
      { category_name: 'Alimentação' },
      { category_name: 'Transporte' },
      { category_name: 'Moradia' },
      { category_name: 'Saúde' },
      { category_name: 'Educação' },
      { category_name: 'Lazer' },
      { category_name: 'Vestuário' },
      { category_name: 'Contas (água, luz, internet)' },
      { category_name: 'Impostos' },
      { category_name: 'Outros' },
    ]);
    console.log('Categorias iniciais criadas.');

    // Adicionar dados de teste
    const expensesSeeder = require('./seeders/expenses');
    await expensesSeeder(User, Expense, Category, CreditCard);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});