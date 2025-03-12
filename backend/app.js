import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import expenseRoutes from './routes/expenses.js';
import incomeRoutes from './routes/incomes.js';
import dashboardRoutes from './routes/dashboard.js';
import bankRoutes from './routes/bank.js';
import budgetRoutes from './routes/budgets.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/budgets', budgetRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo deu errado!' });
});

// Sincroniza os modelos com o banco de dados
sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao sincronizar banco de dados:', error);
  });

export default app; 